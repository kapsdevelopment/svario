do $$
begin
  if not exists (select 1 from pg_type where typname = 'survey_legal_basis') then
    create type public.survey_legal_basis as enum (
      'consent',
      'legitimate_interests',
      'contract',
      'legal_obligation',
      'public_task',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'survey_retention_action') then
    create type public.survey_retention_action as enum (
      'delete_response',
      'anonymize_response'
    );
  end if;
end $$;

create table public.survey_privacy_settings (
  survey_id uuid primary key references public.surveys(id) on delete cascade,
  enabled boolean not null default false,
  personal_data_expected boolean not null default false,
  controller_name text,
  controller_contact text,
  purpose text,
  legal_basis public.survey_legal_basis,
  legal_basis_note text,
  consent_text text,
  retention_days integer,
  retention_action public.survey_retention_action not null default 'delete_response',
  respondent_notice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_privacy_controller_name_not_empty check (
    controller_name is null or length(btrim(controller_name)) > 0
  ),
  constraint survey_privacy_controller_contact_not_empty check (
    controller_contact is null or length(btrim(controller_contact)) > 0
  ),
  constraint survey_privacy_purpose_not_empty check (
    purpose is null or length(btrim(purpose)) > 0
  ),
  constraint survey_privacy_legal_basis_note_not_empty check (
    legal_basis_note is null or length(btrim(legal_basis_note)) > 0
  ),
  constraint survey_privacy_consent_text_not_empty check (
    consent_text is null or length(btrim(consent_text)) > 0
  ),
  constraint survey_privacy_respondent_notice_not_empty check (
    respondent_notice is null or length(btrim(respondent_notice)) > 0
  ),
  constraint survey_privacy_retention_days_positive check (
    retention_days is null or retention_days between 1 and 3650
  )
);

alter table public.survey_responses
  add column retention_due_at timestamptz,
  add column anonymized_at timestamptz,
  add column privacy_consent_given_at timestamptz,
  add column privacy_notice_snapshot jsonb not null default '{}'::jsonb,
  add constraint survey_responses_privacy_notice_snapshot_is_object
    check (jsonb_typeof(privacy_notice_snapshot) = 'object');

create index survey_responses_retention_due_at_idx
  on public.survey_responses(retention_due_at)
  where retention_due_at is not null;

create trigger survey_privacy_settings_set_updated_at
  before update on public.survey_privacy_settings
  for each row execute function app_private.set_updated_at();

create or replace function app_private.ensure_survey_privacy_settings()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  insert into public.survey_privacy_settings (
    survey_id,
    enabled,
    personal_data_expected,
    retention_days,
    retention_action
  )
  values (
    new.id,
    new.response_mode = 'identified',
    new.response_mode = 'identified',
    90,
    'delete_response'
  )
  on conflict (survey_id) do nothing;

  return new;
end;
$$;

create trigger surveys_ensure_privacy_settings
  after insert on public.surveys
  for each row execute function app_private.ensure_survey_privacy_settings();

insert into public.survey_privacy_settings (
  survey_id,
  enabled,
  personal_data_expected,
  retention_days,
  retention_action
)
select
  s.id,
  s.response_mode = 'identified',
  s.response_mode = 'identified',
  90,
  'delete_response'
from public.surveys s
on conflict (survey_id) do nothing;

alter table public.survey_privacy_settings enable row level security;

create policy "survey privacy readable select"
on public.survey_privacy_settings
for select
to authenticated
using (app_private.can_read_survey(survey_id));

create policy "survey privacy manageable insert"
on public.survey_privacy_settings
for insert
to authenticated
with check (app_private.can_manage_survey(survey_id));

create policy "survey privacy manageable update"
on public.survey_privacy_settings
for update
to authenticated
using (app_private.can_manage_survey(survey_id))
with check (app_private.can_manage_survey(survey_id));

create policy "survey privacy public read answerable"
on public.survey_privacy_settings
for select
to anon
using (
  enabled
  and app_private.is_survey_publicly_answerable(survey_id)
);

create or replace function app_private.survey_privacy_is_complete(
  p_survey_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.survey_privacy_settings ps
    where ps.survey_id = p_survey_id
      and length(btrim(coalesce(ps.controller_name, ''))) > 0
      and length(btrim(coalesce(ps.controller_contact, ''))) > 0
      and length(btrim(coalesce(ps.purpose, ''))) > 0
      and ps.legal_basis is not null
      and ps.retention_days is not null
      and (
        ps.legal_basis <> 'consent'
        or length(btrim(coalesce(ps.consent_text, ''))) > 0
      )
  );
$$;

create or replace function app_private.prevent_incomplete_survey_publish()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_question_count integer;
  v_privacy public.survey_privacy_settings%rowtype;
  v_privacy_required boolean;
begin
  if old.status is distinct from new.status and new.status = 'published' then
    select count(*)
      into v_question_count
    from public.questions q
    where q.survey_id = new.id;

    if v_question_count = 0 then
      raise exception 'Skjemaet må ha minst ett spørsmål før publisering.';
    end if;

    select ps.*
      into v_privacy
    from public.survey_privacy_settings ps
    where ps.survey_id = new.id;

    v_privacy_required :=
      new.response_mode = 'identified'
      or coalesce(v_privacy.enabled, false)
      or coalesce(v_privacy.personal_data_expected, false);

    if v_privacy_required
       and not app_private.survey_privacy_is_complete(new.id) then
      raise exception 'Fyll ut behandlingsansvarlig, formål, rettslig grunnlag og lagringstid før publisering.';
    end if;
  end if;

  return new;
end;
$$;

create trigger surveys_prevent_incomplete_publish
  before update on public.surveys
  for each row execute function app_private.prevent_incomplete_survey_publish();

create or replace function app_private.publish_survey(p_survey_id uuid)
returns public.surveys
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_survey public.surveys%rowtype;
  v_question_count integer;
  v_privacy public.survey_privacy_settings%rowtype;
  v_privacy_required boolean;
begin
  if not app_private.can_manage_survey(p_survey_id) then
    raise exception 'Survey not found or not manageable by current account.';
  end if;

  select s.*
    into v_survey
  from public.surveys s
  where s.id = p_survey_id
  for update;

  if not found then
    raise exception 'Survey not found.';
  end if;

  if v_survey.status <> 'draft' then
    raise exception 'Only draft surveys can be published.';
  end if;

  select count(*)
    into v_question_count
  from public.questions q
  where q.survey_id = v_survey.id;

  if v_question_count = 0 then
    raise exception 'Skjemaet må ha minst ett spørsmål før publisering.';
  end if;

  select ps.*
    into v_privacy
  from public.survey_privacy_settings ps
  where ps.survey_id = v_survey.id;

  v_privacy_required :=
    v_survey.response_mode = 'identified'
    or coalesce(v_privacy.enabled, false)
    or coalesce(v_privacy.personal_data_expected, false);

  if v_survey.response_mode = 'identified'
     and not coalesce(v_privacy.enabled, false) then
    update public.survey_privacy_settings
    set
      enabled = true,
      personal_data_expected = true
    where survey_id = v_survey.id
    returning * into v_privacy;
  end if;

  if v_privacy_required
     and not app_private.survey_privacy_is_complete(v_survey.id) then
    raise exception 'Fyll ut behandlingsansvarlig, formål, rettslig grunnlag og lagringstid før publisering.';
  end if;

  update public.surveys
  set
    status = 'published',
    published_at = now()
  where id = v_survey.id
  returning * into v_survey;

  return v_survey;
end;
$$;

create or replace function public.publish_survey(p_survey_id uuid)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$
  select app_private.publish_survey(p_survey_id);
$$;

create or replace function app_private.build_privacy_notice_snapshot(
  p_privacy public.survey_privacy_settings
)
returns jsonb
language sql
stable
security definer
set search_path = public, app_private
as $$
  select case
    when p_privacy.enabled then
      jsonb_build_object(
        'controllerName', p_privacy.controller_name,
        'controllerContact', p_privacy.controller_contact,
        'purpose', p_privacy.purpose,
        'legalBasis', p_privacy.legal_basis,
        'legalBasisNote', p_privacy.legal_basis_note,
        'consentText', p_privacy.consent_text,
        'retentionDays', p_privacy.retention_days,
        'retentionAction', p_privacy.retention_action,
        'respondentNotice', p_privacy.respondent_notice
      )
    else '{}'::jsonb
  end;
$$;

create or replace function app_private.normalize_response_metadata(
  p_metadata jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public, app_private
as $$
  select case
    when normalized.source is null then '{}'::jsonb
    else jsonb_build_object('source', normalized.source)
  end
  from (
    select left(nullif(btrim(coalesce(p_metadata->>'source', '')), ''), 80) as source
  ) normalized;
$$;

drop function if exists public.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb
);

drop function if exists app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb
);

create or replace function app_private.submit_survey_response(
  p_survey_slug text,
  p_answers jsonb,
  p_respondent_name text default null,
  p_respondent_email text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_privacy_consent_given boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
  v_privacy public.survey_privacy_settings%rowtype;
  v_response_id uuid;
  v_answer_id uuid;
  v_answer_item jsonb;
  v_question public.questions%rowtype;
  v_question_id uuid;
  v_option_ids uuid[];
  v_option_count integer;
  v_free_text text;
  v_likert_value smallint;
  v_scale_min smallint;
  v_scale_max smallint;
  v_submitted_at timestamptz := now();
  v_seen_question_ids uuid[] := array[]::uuid[];
  v_answered_question_ids uuid[] := array[]::uuid[];
  v_missing_required_prompt text;
  v_respondent_name text := nullif(btrim(coalesce(p_respondent_name, '')), '');
  v_respondent_email text := nullif(lower(btrim(coalesce(p_respondent_email, ''))), '');
begin
  if p_survey_slug is null or btrim(p_survey_slug) = '' then
    raise exception 'Survey link is missing.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array.';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Metadata must be a JSON object.';
  end if;

  select s.*
    into v_survey
  from public.surveys s
  where s.slug = lower(btrim(p_survey_slug))
    and app_private.is_survey_publicly_answerable(s.id)
  limit 1;

  if not found then
    raise exception 'Survey is not available for responses.';
  end if;

  select ps.*
    into v_privacy
  from public.survey_privacy_settings ps
  where ps.survey_id = v_survey.id;

  if coalesce(v_privacy.enabled, false)
     and v_privacy.legal_basis = 'consent'
     and not p_privacy_consent_given then
    raise exception 'Samtykke må bekreftes før svaret kan sendes inn.';
  end if;

  if v_survey.response_mode = 'identified'
     and v_respondent_name is null
     and v_respondent_email is null then
    raise exception 'Identified surveys require respondent name or email.';
  end if;

  if v_survey.response_mode = 'anonymous' then
    v_respondent_name := null;
    v_respondent_email := null;
  end if;

  insert into public.survey_responses (
    survey_id,
    response_mode,
    created_by_account_id,
    respondent_name,
    respondent_email,
    metadata,
    submitted_at,
    retention_due_at,
    privacy_consent_given_at,
    privacy_notice_snapshot
  )
  values (
    v_survey.id,
    v_survey.response_mode,
    case
      when v_survey.response_mode = 'identified'
        then app_private.current_account_id()
      else null
    end,
    v_respondent_name,
    v_respondent_email,
    app_private.normalize_response_metadata(p_metadata),
    v_submitted_at,
    case
      when coalesce(v_privacy.enabled, false)
           and v_privacy.retention_days is not null
        then v_submitted_at + make_interval(days => v_privacy.retention_days)
      else null
    end,
    case
      when coalesce(v_privacy.enabled, false)
           and v_privacy.legal_basis = 'consent'
           and p_privacy_consent_given
        then v_submitted_at
      else null
    end,
    app_private.build_privacy_notice_snapshot(v_privacy)
  )
  returning id into v_response_id;

  for v_answer_item in
    select value
    from jsonb_array_elements(p_answers)
  loop
    if jsonb_typeof(v_answer_item) <> 'object' then
      raise exception 'Each answer must be a JSON object.';
    end if;

    if v_answer_item->>'questionId' is null then
      raise exception 'Each answer must include a questionId.';
    end if;

    v_question_id := (v_answer_item->>'questionId')::uuid;

    if v_question_id = any(v_seen_question_ids) then
      raise exception 'Each question can only be answered once.';
    end if;

    v_seen_question_ids := array_append(v_seen_question_ids, v_question_id);

    select q.*
      into v_question
    from public.questions q
    where q.id = v_question_id
      and q.survey_id = v_survey.id;

    if not found then
      raise exception 'Answer references an unknown question.';
    end if;

    v_free_text := nullif(btrim(coalesce(v_answer_item->>'freeText', '')), '');
    v_likert_value := null;
    v_option_ids := array[]::uuid[];

    if v_answer_item ? 'optionIds' then
      if jsonb_typeof(v_answer_item->'optionIds') <> 'array' then
        raise exception 'optionIds must be an array.';
      end if;

      select coalesce(array_agg(distinct option_id), array[]::uuid[])
        into v_option_ids
      from (
        select value::uuid as option_id
        from jsonb_array_elements_text(v_answer_item->'optionIds')
      ) selected_options;
    end if;

    if v_answer_item ? 'likertValue'
       and v_answer_item->>'likertValue' is not null
       and btrim(v_answer_item->>'likertValue') <> '' then
      v_likert_value := (v_answer_item->>'likertValue')::smallint;
    end if;

    if v_question.type = 'free_text' then
      if v_likert_value is not null or cardinality(v_option_ids) > 0 then
        raise exception 'Free-text questions cannot include choices or scale values.';
      end if;

      if v_free_text is null then
        continue;
      end if;

      insert into public.answers (response_id, question_id, free_text)
      values (v_response_id, v_question.id, v_free_text);

      v_answered_question_ids := array_append(v_answered_question_ids, v_question.id);

    elsif v_question.type in ('likert_scale', 'likert_1_5') then
      if v_free_text is not null or cardinality(v_option_ids) > 0 then
        raise exception 'Scale questions cannot include free text or choices.';
      end if;

      if v_likert_value is null then
        continue;
      end if;

      v_scale_min := coalesce(v_question.scale_min, 1);
      v_scale_max := coalesce(v_question.scale_max, 5);

      if v_likert_value < v_scale_min or v_likert_value > v_scale_max then
        raise exception 'Scale values must be between % and %.', v_scale_min, v_scale_max;
      end if;

      insert into public.answers (response_id, question_id, likert_value)
      values (v_response_id, v_question.id, v_likert_value);

      v_answered_question_ids := array_append(v_answered_question_ids, v_question.id);

    elsif v_question.type = 'multiple_choice' then
      if v_free_text is not null or v_likert_value is not null then
        raise exception 'Choice questions cannot include free text or scale values.';
      end if;

      if cardinality(v_option_ids) = 0 then
        continue;
      end if;

      if not v_question.allow_multiple and cardinality(v_option_ids) > 1 then
        raise exception 'This question only allows one choice.';
      end if;

      select count(*)
        into v_option_count
      from public.question_options qo
      where qo.question_id = v_question.id
        and qo.id = any(v_option_ids);

      if v_option_count <> cardinality(v_option_ids) then
        raise exception 'Answer includes choices that do not belong to the question.';
      end if;

      insert into public.answers (response_id, question_id)
      values (v_response_id, v_question.id)
      returning id into v_answer_id;

      insert into public.answer_options (answer_id, option_id)
      select v_answer_id, option_id
      from unnest(v_option_ids) as option_id;

      v_answered_question_ids := array_append(v_answered_question_ids, v_question.id);

    else
      raise exception 'Unsupported question type.';
    end if;
  end loop;

  select q.prompt
    into v_missing_required_prompt
  from public.questions q
  where q.survey_id = v_survey.id
    and q.is_required
    and not (q.id = any(v_answered_question_ids))
  order by q.sort_order
  limit 1;

  if found then
    raise exception 'Missing required answer: %', v_missing_required_prompt;
  end if;

  return v_response_id;
end;
$$;

create or replace function public.submit_survey_response(
  p_survey_slug text,
  p_answers jsonb,
  p_respondent_name text default null,
  p_respondent_email text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_privacy_consent_given boolean default false
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.submit_survey_response(
    p_survey_slug,
    p_answers,
    p_respondent_name,
    p_respondent_email,
    p_metadata,
    p_privacy_consent_given
  );
$$;

revoke all on table public.survey_privacy_settings from anon, authenticated;
grant select on table public.survey_privacy_settings to anon;
grant select, insert, update on table public.survey_privacy_settings to authenticated;
grant select, insert, update, delete on table public.survey_privacy_settings to service_role;

revoke all on function app_private.ensure_survey_privacy_settings() from public;
revoke all on function app_private.survey_privacy_is_complete(uuid) from public;
revoke all on function app_private.prevent_incomplete_survey_publish() from public;
revoke all on function app_private.publish_survey(uuid) from public;
revoke all on function public.publish_survey(uuid) from public;
revoke all on function app_private.build_privacy_notice_snapshot(public.survey_privacy_settings) from public;
revoke all on function app_private.normalize_response_metadata(jsonb) from public;

revoke all on function app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb,
  boolean
) from public;

revoke all on function public.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb,
  boolean
) from public;

grant execute on function app_private.survey_privacy_is_complete(uuid)
  to authenticated, service_role;
grant execute on function app_private.publish_survey(uuid)
  to authenticated, service_role;
grant execute on function public.publish_survey(uuid)
  to authenticated, service_role;

grant execute on function app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb,
  boolean
) to anon, authenticated, service_role;

grant execute on function public.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb,
  boolean
) to anon, authenticated, service_role;
