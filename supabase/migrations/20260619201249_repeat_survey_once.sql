alter table public.surveys
  add column if not exists repeated_from_survey_id uuid
    references public.surveys(id) on delete set null;

create index if not exists surveys_repeated_from_survey_id_idx
  on public.surveys(repeated_from_survey_id);

create or replace function app_private.create_survey_slug(p_title text)
returns text
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_base text;
begin
  v_base := lower(coalesce(p_title, ''));
  v_base := replace(v_base, 'æ', 'ae');
  v_base := replace(v_base, 'ø', 'o');
  v_base := replace(v_base, 'å', 'a');
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := left(v_base, 64);
  v_base := trim(both '-' from v_base);

  if length(v_base) < 3 then
    v_base := 'skjema';
  end if;

  return v_base || '-' || left(replace(extensions.gen_random_uuid()::text, '-', ''), 8);
end;
$$;

create or replace function app_private.repeat_survey_once(p_survey_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_account_id uuid;
  v_source public.surveys%rowtype;
  v_source_section public.survey_sections%rowtype;
  v_source_question public.questions%rowtype;
  v_new_survey_id uuid;
  v_new_section_id uuid;
  v_new_question_id uuid;
  v_section_id_map jsonb := '{}'::jsonb;
begin
  if p_survey_id is null then
    raise exception 'Survey id is required.';
  end if;

  v_account_id := app_private.current_account_id();

  if v_account_id is null then
    raise exception 'Account is not initialized.';
  end if;

  select *
    into v_source
  from public.surveys
  where id = p_survey_id;

  if not found or not app_private.can_read_survey(p_survey_id) then
    raise exception 'Survey not found or not readable by current account.';
  end if;

  if not app_private.can_create_survey(
    v_account_id,
    v_source.workspace_id,
    v_source.visibility
  ) then
    raise exception 'Current account cannot repeat this survey.';
  end if;

  insert into public.surveys (
    owner_account_id,
    workspace_id,
    visibility,
    title,
    description,
    slug,
    status,
    response_mode,
    starts_at,
    ends_at,
    published_at,
    closed_at,
    repeated_from_survey_id
  )
  values (
    v_account_id,
    v_source.workspace_id,
    v_source.visibility,
    v_source.title,
    v_source.description,
    app_private.create_survey_slug(v_source.title),
    'draft'::public.survey_status,
    v_source.response_mode,
    v_source.starts_at,
    v_source.ends_at,
    null,
    null,
    v_source.id
  )
  returning id into v_new_survey_id;

  for v_source_section in
    select *
    from public.survey_sections
    where survey_id = p_survey_id
    order by sort_order
  loop
    insert into public.survey_sections (
      survey_id,
      title,
      description,
      sort_order
    )
    values (
      v_new_survey_id,
      v_source_section.title,
      v_source_section.description,
      v_source_section.sort_order
    )
    returning id into v_new_section_id;

    v_section_id_map := v_section_id_map || jsonb_build_object(
      v_source_section.id::text,
      v_new_section_id::text
    );
  end loop;

  for v_source_question in
    select *
    from public.questions
    where survey_id = p_survey_id
    order by sort_order
  loop
    insert into public.questions (
      survey_id,
      section_id,
      type,
      prompt,
      description,
      is_required,
      allow_multiple,
      scale_min,
      scale_max,
      scale_variant,
      sort_order,
      visualization_type,
      visualization_color_mode
    )
    values (
      v_new_survey_id,
      case
        when v_source_question.section_id is null then null
        else (v_section_id_map ->> v_source_question.section_id::text)::uuid
      end,
      v_source_question.type,
      v_source_question.prompt,
      v_source_question.description,
      v_source_question.is_required,
      v_source_question.allow_multiple,
      v_source_question.scale_min,
      v_source_question.scale_max,
      v_source_question.scale_variant,
      v_source_question.sort_order,
      v_source_question.visualization_type,
      v_source_question.visualization_color_mode
    )
    returning id into v_new_question_id;

    insert into public.question_options (
      question_id,
      label,
      value,
      sort_order
    )
    select
      v_new_question_id,
      label,
      value,
      sort_order
    from public.question_options
    where question_id = v_source_question.id
    order by sort_order;
  end loop;

  return v_new_survey_id;
end;
$$;

create or replace function public.repeat_survey_once(p_survey_id uuid)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.repeat_survey_once(p_survey_id);
$$;

revoke all on function app_private.create_survey_slug(text) from public;
revoke all on function app_private.repeat_survey_once(uuid) from public;
revoke all on function public.repeat_survey_once(uuid) from public;

grant execute on function app_private.repeat_survey_once(uuid)
  to authenticated, service_role;
grant execute on function public.repeat_survey_once(uuid)
  to authenticated, service_role;
