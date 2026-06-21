-- Hard limits for user-controlled text. UI validation is convenience only;
-- the database remains the authoritative boundary.

alter table public.surveys
  add constraint surveys_title_length check (length(title) <= 160),
  add constraint surveys_description_length check (
    description is null or length(description) <= 2000
  );

alter table public.survey_sections
  add constraint survey_sections_title_length check (
    title is null or length(title) <= 160
  ),
  add constraint survey_sections_description_length check (
    description is null or length(description) <= 1000
  );

alter table public.questions
  add constraint questions_prompt_length check (length(prompt) <= 500),
  add constraint questions_description_length check (
    description is null or length(description) <= 1000
  );

alter table public.question_options
  add constraint question_options_label_length check (length(label) <= 250),
  add constraint question_options_value_length check (
    value is null or length(value) <= 100
  );

alter table public.survey_responses
  add constraint survey_responses_respondent_name_length check (
    respondent_name is null or length(respondent_name) <= 160
  ),
  add constraint survey_responses_respondent_email_length check (
    respondent_email is null or length(respondent_email) <= 320
  ),
  add constraint survey_responses_metadata_size check (
    octet_length(metadata::text) <= 1024
  ),
  add constraint survey_responses_privacy_notice_snapshot_size check (
    octet_length(privacy_notice_snapshot::text) <= 12288
  );

alter table public.answers
  add constraint answers_free_text_length check (
    free_text is null or length(free_text) <= 10000
  );

alter table public.survey_privacy_settings
  add constraint survey_privacy_controller_name_length check (
    controller_name is null or length(controller_name) <= 160
  ),
  add constraint survey_privacy_controller_contact_length check (
    controller_contact is null or length(controller_contact) <= 320
  ),
  add constraint survey_privacy_purpose_length check (
    purpose is null or length(purpose) <= 1000
  ),
  add constraint survey_privacy_legal_basis_note_length check (
    legal_basis_note is null or length(legal_basis_note) <= 1000
  ),
  add constraint survey_privacy_consent_text_length check (
    consent_text is null or length(consent_text) <= 2000
  ),
  add constraint survey_privacy_respondent_notice_length check (
    respondent_notice is null or length(respondent_notice) <= 2000
  );

create table app_private.survey_submission_rate_limits (
  id uuid primary key default extensions.gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  client_fingerprint text not null,
  submitted_at timestamptz not null default now()
);

create index survey_submission_rate_limits_lookup_idx
  on app_private.survey_submission_rate_limits(
    survey_id,
    client_fingerprint,
    submitted_at desc
  );

create index survey_submission_rate_limits_submitted_at_idx
  on app_private.survey_submission_rate_limits(submitted_at);

alter table app_private.survey_submission_rate_limits enable row level security;

revoke all on table app_private.survey_submission_rate_limits
  from public, anon, authenticated;
grant select, insert, delete on table app_private.survey_submission_rate_limits
  to service_role;

comment on table app_private.survey_submission_rate_limits is
  'Stores hashed public submission fingerprints for abuse throttling. Raw IP addresses are not stored.';

create or replace function app_private.enforce_survey_submission_rate_limit(
  p_survey_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_headers_text text;
  v_headers jsonb := '{}'::jsonb;
  v_ip_text text;
  v_user_agent text;
  v_fingerprint text;
  v_recent_count integer;
  v_daily_count integer;
begin
  if p_survey_id is null then
    raise exception 'Survey id is required for rate limiting.';
  end if;

  v_headers_text := nullif(current_setting('request.headers', true), '');

  if v_headers_text is not null then
    v_headers := v_headers_text::jsonb;
  end if;

  v_ip_text := nullif(
    btrim(
      split_part(
        coalesce(
          v_headers->>'x-forwarded-for',
          v_headers->>'cf-connecting-ip',
          v_headers->>'x-real-ip',
          'unknown'
        ),
        ',',
        1
      )
    ),
    ''
  );
  v_user_agent := left(coalesce(v_headers->>'user-agent', 'unknown'), 160);
  v_fingerprint := encode(
    extensions.digest(
      p_survey_id::text || ':' || coalesce(v_ip_text, 'unknown') || ':' || v_user_agent,
      'sha256'
    ),
    'hex'
  );

  delete from app_private.survey_submission_rate_limits
  where submitted_at < now() - interval '2 days';

  select count(*)
    into v_recent_count
  from app_private.survey_submission_rate_limits
  where survey_id = p_survey_id
    and client_fingerprint = v_fingerprint
    and submitted_at >= now() - interval '10 minutes';

  if v_recent_count >= 30 then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'message',
        'For mange innsendinger på kort tid. Prøv igjen litt senere.'
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests'
      )::text;
  end if;

  select count(*)
    into v_daily_count
  from app_private.survey_submission_rate_limits
  where survey_id = p_survey_id
    and client_fingerprint = v_fingerprint
    and submitted_at >= now() - interval '24 hours';

  if v_daily_count >= 200 then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'message',
        'For mange innsendinger. Prøv igjen senere.'
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests'
      )::text;
  end if;

  insert into app_private.survey_submission_rate_limits (
    survey_id,
    client_fingerprint,
    submitted_at
  )
  values (
    p_survey_id,
    v_fingerprint,
    now()
  );
end;
$$;

revoke all on function app_private.enforce_survey_submission_rate_limit(uuid)
  from public, anon, authenticated;

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
  v_answer_count integer;
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

  if length(btrim(p_survey_slug)) > 100 then
    raise exception 'Survey link is too long.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array.';
  end if;

  v_answer_count := jsonb_array_length(p_answers);

  if v_answer_count > 250 then
    raise exception 'A response can contain at most 250 answers.';
  end if;

  if octet_length(p_answers::text) > 1048576 then
    raise exception 'Response payload is too large.';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Metadata must be a JSON object.';
  end if;

  if octet_length(p_metadata::text) > 2048 then
    raise exception 'Metadata is too large.';
  end if;

  if v_respondent_name is not null and length(v_respondent_name) > 160 then
    raise exception 'Respondent name can be at most 160 characters.';
  end if;

  if v_respondent_email is not null and length(v_respondent_email) > 320 then
    raise exception 'Respondent email can be at most 320 characters.';
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

  perform app_private.enforce_survey_submission_rate_limit(v_survey.id);

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

    if v_free_text is not null and length(v_free_text) > 10000 then
      raise exception 'Free-text answers can be at most 10000 characters.';
    end if;

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

      if cardinality(v_option_ids) > 100 then
        raise exception 'An answer can include at most 100 selected choices.';
      end if;
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

revoke all on function app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb,
  boolean
) from public;

grant execute on function app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb,
  boolean
) to anon, authenticated, service_role;
