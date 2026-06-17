do $$
begin
  create type public.question_scale_variant as enum (
    'buttons',
    'stars',
    'nps'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.questions
  add column if not exists scale_variant public.question_scale_variant;

alter table public.questions
  disable trigger questions_prevent_changes_after_responses;

update public.questions
set scale_variant = case
  when type in ('likert_1_5', 'likert_scale')
    then 'buttons'::public.question_scale_variant
  else null
end
where scale_variant is null;

alter table public.questions
  enable trigger questions_prevent_changes_after_responses;

alter table public.questions
  drop constraint if exists questions_scale_variant_matches_question_type,
  drop constraint if exists questions_star_scale_range,
  drop constraint if exists questions_nps_scale_range;

alter table public.questions
  add constraint questions_scale_variant_matches_question_type check (
    (
      type in ('likert_1_5', 'likert_scale')
      and scale_variant is not null
    )
    or (
      type in ('multiple_choice', 'free_text')
      and scale_variant is null
    )
  ),
  add constraint questions_star_scale_range check (
    scale_variant is distinct from 'stars'::public.question_scale_variant
    or (scale_min = 1 and scale_max = 5)
  ),
  add constraint questions_nps_scale_range check (
    scale_variant is distinct from 'nps'::public.question_scale_variant
    or (scale_min = 0 and scale_max = 10)
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
      and old.scale_variant is not distinct from new.scale_variant
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

grant usage on type public.question_scale_variant to anon, authenticated, service_role;

grant select (scale_variant) on public.questions to anon;
