create or replace function app_private.survey_has_responses(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.survey_responses sr
    where sr.survey_id = p_survey_id
  );
$$;

create or replace function app_private.prevent_survey_identity_changes_after_responses()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if app_private.survey_has_responses(old.id) and (
    old.id is distinct from new.id
    or old.owner_account_id is distinct from new.owner_account_id
    or old.slug is distinct from new.slug
    or old.response_mode is distinct from new.response_mode
    or old.published_at is distinct from new.published_at
  ) then
    raise exception 'Survey identity is locked because the survey has submitted responses.';
  end if;

  return new;
end;
$$;

create or replace function app_private.prevent_section_changes_after_responses()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if (
    (tg_op in ('UPDATE', 'DELETE') and app_private.survey_has_responses(old.survey_id))
    or (tg_op in ('INSERT', 'UPDATE') and app_private.survey_has_responses(new.survey_id))
  ) then
    raise exception 'Survey structure is locked because the survey has submitted responses.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function app_private.prevent_question_changes_after_responses()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if (
    (tg_op in ('UPDATE', 'DELETE') and app_private.survey_has_responses(old.survey_id))
    or (tg_op in ('INSERT', 'UPDATE') and app_private.survey_has_responses(new.survey_id))
  ) then
    raise exception 'Survey structure is locked because the survey has submitted responses.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function app_private.question_survey_has_responses(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.questions q
    where q.id = p_question_id
      and app_private.survey_has_responses(q.survey_id)
  );
$$;

create or replace function app_private.prevent_question_option_changes_after_responses()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if (
    (tg_op in ('UPDATE', 'DELETE') and app_private.question_survey_has_responses(old.question_id))
    or (tg_op in ('INSERT', 'UPDATE') and app_private.question_survey_has_responses(new.question_id))
  ) then
    raise exception 'Survey structure is locked because the survey has submitted responses.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists surveys_prevent_identity_changes_after_responses on public.surveys;
create trigger surveys_prevent_identity_changes_after_responses
  before update on public.surveys
  for each row execute function app_private.prevent_survey_identity_changes_after_responses();

drop trigger if exists survey_sections_prevent_changes_after_responses on public.survey_sections;
create trigger survey_sections_prevent_changes_after_responses
  before insert or update or delete on public.survey_sections
  for each row execute function app_private.prevent_section_changes_after_responses();

drop trigger if exists questions_prevent_changes_after_responses on public.questions;
create trigger questions_prevent_changes_after_responses
  before insert or update or delete on public.questions
  for each row execute function app_private.prevent_question_changes_after_responses();

drop trigger if exists question_options_prevent_changes_after_responses on public.question_options;
create trigger question_options_prevent_changes_after_responses
  before insert or update or delete on public.question_options
  for each row execute function app_private.prevent_question_option_changes_after_responses();

revoke all on function app_private.survey_has_responses(uuid) from public;
revoke all on function app_private.prevent_survey_identity_changes_after_responses() from public;
revoke all on function app_private.prevent_section_changes_after_responses() from public;
revoke all on function app_private.prevent_question_changes_after_responses() from public;
revoke all on function app_private.question_survey_has_responses(uuid) from public;
revoke all on function app_private.prevent_question_option_changes_after_responses() from public;
