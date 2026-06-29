create or replace function app_private.move_survey_question(
  p_survey_id uuid,
  p_question_id uuid,
  p_source_section_id uuid,
  p_target_section_id uuid,
  p_source_question_ids uuid[],
  p_target_question_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_source_count integer := coalesce(array_length(p_source_question_ids, 1), 0);
  v_target_count integer := coalesce(array_length(p_target_question_ids, 1), 0);
  v_source_distinct_count integer;
  v_target_distinct_count integer;
  v_current_section_id uuid;
  v_expected_source_count integer;
  v_matching_source_count integer;
  v_expected_target_count integer;
  v_matching_target_count integer;
  v_target_contains_moved_count integer;
  v_source_contains_moved_count integer;
  v_source_sort_orders integer[];
  v_target_sort_orders integer[];
  v_temp_offset integer;
begin
  if p_survey_id is null then
    raise exception 'Survey id is required.';
  end if;

  if p_question_id is null then
    raise exception 'Question id is required.';
  end if;

  if p_source_question_ids is null or p_target_question_ids is null then
    raise exception 'Question order is required.';
  end if;

  if p_source_section_id is not distinct from p_target_section_id then
    raise exception 'Source and target sections must be different.';
  end if;

  if not app_private.can_manage_survey(p_survey_id) then
    raise exception 'Survey not found or not accessible.';
  end if;

  if p_target_section_id is not null and not exists (
    select 1
    from public.survey_sections ss
    where ss.id = p_target_section_id
      and ss.survey_id = p_survey_id
  ) then
    raise exception 'Target section not found for survey.';
  end if;

  select q.section_id
    into v_current_section_id
  from public.questions q
  where q.id = p_question_id
    and q.survey_id = p_survey_id
  for update;

  if not found then
    raise exception 'Question not found for survey.';
  end if;

  if v_current_section_id is distinct from p_source_section_id then
    raise exception 'Question is not in the source section.';
  end if;

  select count(distinct question_id)
    into v_source_distinct_count
  from unnest(p_source_question_ids) as input(question_id);

  select count(distinct question_id)
    into v_target_distinct_count
  from unnest(p_target_question_ids) as input(question_id);

  if v_source_distinct_count <> v_source_count then
    raise exception 'Source question order contains duplicates.';
  end if;

  if v_target_distinct_count <> v_target_count then
    raise exception 'Target question order contains duplicates.';
  end if;

  select count(*)
    into v_source_contains_moved_count
  from unnest(p_source_question_ids) as input(question_id)
  where input.question_id = p_question_id;

  if v_source_contains_moved_count > 0 then
    raise exception 'Source question order cannot include moved question.';
  end if;

  select count(*)
    into v_target_contains_moved_count
  from unnest(p_target_question_ids) as input(question_id)
  where input.question_id = p_question_id;

  if v_target_contains_moved_count <> 1 then
    raise exception 'Target question order must include moved question once.';
  end if;

  select count(*)
    into v_expected_source_count
  from public.questions q
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_source_section_id
    and q.id <> p_question_id;

  if v_expected_source_count <> v_source_count then
    raise exception 'Source question order must include every remaining question in the source section.';
  end if;

  select count(*)
    into v_matching_source_count
  from public.questions q
  join unnest(p_source_question_ids) as input(question_id)
    on input.question_id = q.id
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_source_section_id
    and q.id <> p_question_id;

  if v_matching_source_count <> v_expected_source_count then
    raise exception 'Source question order contains questions outside the source section.';
  end if;

  select count(*)
    into v_expected_target_count
  from public.questions q
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_target_section_id;

  if v_expected_target_count + 1 <> v_target_count then
    raise exception 'Target question order must include every question in the target section and the moved question.';
  end if;

  select count(*)
    into v_matching_target_count
  from public.questions q
  join unnest(p_target_question_ids) as input(question_id)
    on input.question_id = q.id
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_target_section_id;

  if v_matching_target_count <> v_expected_target_count then
    raise exception 'Target question order contains questions outside the target section.';
  end if;

  perform 1
  from public.questions q
  where q.survey_id = p_survey_id
    and (
      q.section_id is not distinct from p_source_section_id
      or q.section_id is not distinct from p_target_section_id
      or q.id = p_question_id
    )
  for update;

  select array_agg(q.sort_order order by q.sort_order)
    into v_source_sort_orders
  from public.questions q
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_source_section_id
    and q.id <> p_question_id;

  select array_agg(q.sort_order order by q.sort_order)
    into v_target_sort_orders
  from public.questions q
  where q.survey_id = p_survey_id
    and (
      q.section_id is not distinct from p_target_section_id
      or q.id = p_question_id
    );

  select coalesce(max(q.sort_order), 0) + v_source_count + v_target_count + 1000
    into v_temp_offset
  from public.questions q
  where q.survey_id = p_survey_id;

  with affected_questions as (
    select
      q.id,
      row_number() over (order by q.sort_order)::integer as position
    from public.questions q
    where q.survey_id = p_survey_id
      and (
        q.section_id is not distinct from p_source_section_id
        or q.section_id is not distinct from p_target_section_id
        or q.id = p_question_id
      )
  )
  update public.questions q
     set sort_order = v_temp_offset + affected_questions.position
  from affected_questions
  where q.id = affected_questions.id;

  update public.questions q
     set section_id = p_target_section_id
  where q.id = p_question_id
    and q.survey_id = p_survey_id;

  with source_order as (
    select
      input.question_id,
      input.position::integer as position
    from unnest(p_source_question_ids) with ordinality as input(question_id, position)
  )
  update public.questions q
     set sort_order = v_source_sort_orders[source_order.position]
  from source_order
  where q.id = source_order.question_id;

  with target_order as (
    select
      input.question_id,
      input.position::integer as position
    from unnest(p_target_question_ids) with ordinality as input(question_id, position)
  )
  update public.questions q
     set sort_order = v_target_sort_orders[target_order.position]
  from target_order
  where q.id = target_order.question_id;
end;
$$;

create or replace function public.move_survey_question(
  p_survey_id uuid,
  p_question_id uuid,
  p_source_section_id uuid,
  p_target_section_id uuid,
  p_source_question_ids uuid[],
  p_target_question_ids uuid[]
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select app_private.move_survey_question(
    p_survey_id,
    p_question_id,
    p_source_section_id,
    p_target_section_id,
    p_source_question_ids,
    p_target_question_ids
  );
$$;

revoke all on function app_private.move_survey_question(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid[],
  uuid[]
) from public;

revoke all on function public.move_survey_question(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid[],
  uuid[]
) from public;

grant execute on function app_private.move_survey_question(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid[],
  uuid[]
) to authenticated, service_role;

grant execute on function public.move_survey_question(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid[],
  uuid[]
) to authenticated, service_role;
