do $$
begin
  create type public.question_visualization_type as enum (
    'bar',
    'pie',
    'word_cloud',
    'list'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.question_visualization_color_mode as enum (
    'muted',
    'colorful'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.questions
  add column if not exists visualization_type public.question_visualization_type,
  add column if not exists visualization_color_mode public.question_visualization_color_mode;

alter table public.questions
  disable trigger questions_prevent_changes_after_responses;

update public.questions
set
  visualization_type = case
    when type = 'free_text' then 'word_cloud'::public.question_visualization_type
    else 'bar'::public.question_visualization_type
  end,
  visualization_color_mode = 'muted'::public.question_visualization_color_mode
where visualization_type is null
  or visualization_color_mode is null;

alter table public.questions
  enable trigger questions_prevent_changes_after_responses;

alter table public.questions
  alter column visualization_type set not null,
  alter column visualization_type set default 'bar'::public.question_visualization_type,
  alter column visualization_color_mode set not null,
  alter column visualization_color_mode set default 'muted'::public.question_visualization_color_mode;

alter table public.questions
  drop constraint if exists questions_visualization_matches_question_type;

alter table public.questions
  add constraint questions_visualization_matches_question_type check (
    (
      type in ('multiple_choice', 'likert_1_5', 'likert_scale')
      and visualization_type in ('bar', 'pie')
    )
    or (
      type = 'free_text'
      and visualization_type in ('word_cloud', 'list')
    )
  );

create or replace function app_private.prevent_question_changes_after_responses()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if tg_op = 'DELETE' and app_private.survey_has_responses(old.survey_id) then
    raise exception 'Survey structure is locked because the survey has submitted responses.';
  end if;

  if tg_op = 'INSERT' and app_private.survey_has_responses(new.survey_id) then
    raise exception 'Survey structure is locked because the survey has submitted responses.';
  end if;

  if tg_op = 'UPDATE' and (
    app_private.survey_has_responses(old.survey_id)
    or app_private.survey_has_responses(new.survey_id)
  ) then
    if old.id is not distinct from new.id
      and old.survey_id is not distinct from new.survey_id
      and old.section_id is not distinct from new.section_id
      and old.type is not distinct from new.type
      and old.prompt is not distinct from new.prompt
      and old.description is not distinct from new.description
      and old.is_required is not distinct from new.is_required
      and old.allow_multiple is not distinct from new.allow_multiple
      and old.scale_min is not distinct from new.scale_min
      and old.scale_max is not distinct from new.scale_max
      and old.sort_order is not distinct from new.sort_order
      and old.created_at is not distinct from new.created_at
    then
      return new;
    end if;

    raise exception 'Survey structure is locked because the survey has submitted responses.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

grant usage on type public.question_visualization_type to anon, authenticated, service_role;
grant usage on type public.question_visualization_color_mode to anon, authenticated, service_role;

grant select (
  visualization_type,
  visualization_color_mode
) on public.questions to anon;
