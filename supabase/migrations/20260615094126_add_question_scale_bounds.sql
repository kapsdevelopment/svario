alter table public.questions
  add column if not exists scale_min smallint,
  add column if not exists scale_max smallint;

update public.questions
set
  scale_min = coalesce(scale_min, 1),
  scale_max = coalesce(scale_max, 5)
where type = 'likert_1_5';

update public.questions
set type = 'likert_scale'
where type = 'likert_1_5';

alter table public.questions
  drop constraint if exists questions_scale_bounds_for_likert;

alter table public.questions
  add constraint questions_scale_bounds_for_likert check (
    (
      type = 'likert_scale'
      and scale_min is not null
      and scale_max is not null
      and scale_min >= 0
      and scale_max <= 10
      and scale_min < scale_max
      and (scale_max - scale_min) <= 10
    )
    or (
      type in ('multiple_choice', 'free_text')
      and scale_min is null
      and scale_max is null
    )
  );

alter table public.answers
  drop constraint if exists answers_likert_value_range;

alter table public.answers
  add constraint answers_likert_value_range check (
    likert_value is null or likert_value between 0 and 10
  );

grant select (scale_min, scale_max) on public.questions to anon;

create or replace function app_private.submit_survey_response(
  p_survey_slug text,
  p_answers jsonb,
  p_respondent_name text default null,
  p_respondent_email text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
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
    metadata
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
    p_metadata
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
  p_metadata jsonb default '{}'::jsonb
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
    p_metadata
  );
$$;

revoke all on function app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb
) from public;

revoke all on function public.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb
) from public;

grant execute on function app_private.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb
) to anon, authenticated, service_role;

grant execute on function public.submit_survey_response(
  text,
  jsonb,
  text,
  text,
  jsonb
) to anon, authenticated, service_role;
