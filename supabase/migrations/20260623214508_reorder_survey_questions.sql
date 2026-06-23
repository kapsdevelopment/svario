create or replace function app_private.reorder_survey_questions(
  p_survey_id uuid,
  p_question_ids uuid[],
  p_section_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_question_count integer := coalesce(array_length(p_question_ids, 1), 0);
  v_distinct_count integer;
  v_matching_count integer;
  v_target_count integer;
  v_sort_orders integer[];
  v_temp_offset integer;
begin
  if p_survey_id is null then
    raise exception 'Survey id is required.';
  end if;

  if p_question_ids is null then
    raise exception 'Question order is required.';
  end if;

  if not app_private.can_manage_survey(p_survey_id) then
    raise exception 'Survey not found or not accessible.';
  end if;

  if p_section_id is not null and not exists (
    select 1
    from public.survey_sections ss
    where ss.id = p_section_id
      and ss.survey_id = p_survey_id
  ) then
    raise exception 'Section not found for survey.';
  end if;

  select count(distinct question_id)
    into v_distinct_count
  from unnest(p_question_ids) as input(question_id);

  if v_distinct_count <> v_question_count then
    raise exception 'Question order contains duplicates or empty ids.';
  end if;

  select count(*)
    into v_target_count
  from public.questions q
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_section_id;

  if v_target_count <> v_question_count then
    raise exception 'Question order must include every question in the section.';
  end if;

  if v_question_count = 0 then
    return;
  end if;

  select count(*)
    into v_matching_count
  from public.questions q
  join unnest(p_question_ids) as input(question_id)
    on input.question_id = q.id
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_section_id;

  if v_matching_count <> v_target_count then
    raise exception 'Question order contains questions outside the section.';
  end if;

  perform 1
  from public.questions q
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_section_id
  for update;

  select array_agg(q.sort_order order by q.sort_order)
    into v_sort_orders
  from public.questions q
  where q.survey_id = p_survey_id
    and q.section_id is not distinct from p_section_id;

  select coalesce(max(q.sort_order), 0) + v_question_count + 1000
    into v_temp_offset
  from public.questions q
  where q.survey_id = p_survey_id;

  with current_order as (
    select
      q.id,
      row_number() over (order by q.sort_order)::integer as position
    from public.questions q
    where q.survey_id = p_survey_id
      and q.section_id is not distinct from p_section_id
  )
  update public.questions q
     set sort_order = v_temp_offset + current_order.position
  from current_order
  where q.id = current_order.id;

  with new_order as (
    select
      input.question_id,
      input.position::integer as position
    from unnest(p_question_ids) with ordinality as input(question_id, position)
  )
  update public.questions q
     set sort_order = v_sort_orders[new_order.position]
  from new_order
  where q.id = new_order.question_id;
end;
$$;

create or replace function public.reorder_survey_questions(
  p_survey_id uuid,
  p_question_ids uuid[],
  p_section_id uuid default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select app_private.reorder_survey_questions(
    p_survey_id,
    p_question_ids,
    p_section_id
  );
$$;

revoke all on function app_private.reorder_survey_questions(
  uuid,
  uuid[],
  uuid
) from public;

revoke all on function public.reorder_survey_questions(
  uuid,
  uuid[],
  uuid
) from public;

grant execute on function app_private.reorder_survey_questions(
  uuid,
  uuid[],
  uuid
) to authenticated, service_role;

grant execute on function public.reorder_survey_questions(
  uuid,
  uuid[],
  uuid
) to authenticated, service_role;
