create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'survey_privacy_event_type') then
    create type public.survey_privacy_event_type as enum (
      'response_deleted',
      'response_anonymized'
    );
  end if;
end $$;

create table public.survey_privacy_events (
  id uuid primary key default extensions.gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  response_id uuid,
  event_type public.survey_privacy_event_type not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint survey_privacy_events_details_is_object check (
    jsonb_typeof(details) = 'object'
  )
);

create index survey_privacy_events_survey_id_created_at_idx
  on public.survey_privacy_events(survey_id, created_at desc);

create index survey_privacy_events_response_id_idx
  on public.survey_privacy_events(response_id)
  where response_id is not null;

alter table public.survey_privacy_events enable row level security;

create policy "survey privacy events readable select"
on public.survey_privacy_events
for select
to authenticated
using (app_private.can_read_survey(survey_id));

create or replace function app_private.delete_survey_response_tree(
  p_response_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if p_response_id is null then
    raise exception 'Response id is required.';
  end if;

  delete from public.answer_options ao
  using public.answers a
  where ao.answer_id = a.id
    and a.response_id = p_response_id;

  delete from public.answers
  where response_id = p_response_id;

  delete from public.survey_responses
  where id = p_response_id;

  if not found then
    raise exception 'Response not found.';
  end if;
end;
$$;

create or replace function app_private.get_retention_action_for_response(
  p_notice_snapshot jsonb,
  p_fallback_action public.survey_retention_action
)
returns public.survey_retention_action
language sql
stable
security definer
set search_path = public, app_private
as $$
  select case
    when p_notice_snapshot->>'retentionAction' in (
      'delete_response',
      'anonymize_response'
    ) then (p_notice_snapshot->>'retentionAction')::public.survey_retention_action
    else coalesce(p_fallback_action, 'delete_response'::public.survey_retention_action)
  end;
$$;

create or replace function app_private.apply_due_response_retention(
  p_limit integer default 500
)
returns table(deleted_count integer, anonymized_count integer)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 5000);
  v_response record;
begin
  deleted_count := 0;
  anonymized_count := 0;

  if not pg_try_advisory_xact_lock(hashtext('svario:response-retention')) then
    return next;
    return;
  end if;

  for v_response in
    select
      sr.id,
      sr.survey_id,
      sr.retention_due_at,
      app_private.get_retention_action_for_response(
        sr.privacy_notice_snapshot,
        ps.retention_action
      ) as retention_action
    from public.survey_responses sr
    left join public.survey_privacy_settings ps
      on ps.survey_id = sr.survey_id
    where sr.retention_due_at is not null
      and sr.retention_due_at <= now()
    order by sr.retention_due_at, sr.id
    limit v_limit
    for update of sr skip locked
  loop
    if v_response.retention_action = 'anonymize_response' then
      update public.survey_responses
      set
        created_by_account_id = null,
        respondent_name = null,
        respondent_email = null,
        metadata = '{}'::jsonb,
        anonymized_at = now(),
        retention_due_at = null
      where id = v_response.id;

      insert into public.survey_privacy_events (
        survey_id,
        response_id,
        event_type,
        details
      )
      values (
        v_response.survey_id,
        v_response.id,
        'response_anonymized',
        jsonb_build_object(
          'reason', 'retention_due',
          'retentionDueAt', v_response.retention_due_at,
          'processedBy', 'svario-retention-cron'
        )
      );

      anonymized_count := anonymized_count + 1;
    else
      insert into public.survey_privacy_events (
        survey_id,
        response_id,
        event_type,
        details
      )
      values (
        v_response.survey_id,
        v_response.id,
        'response_deleted',
        jsonb_build_object(
          'reason', 'retention_due',
          'retentionDueAt', v_response.retention_due_at,
          'processedBy', 'svario-retention-cron'
        )
      );

      perform app_private.delete_survey_response_tree(v_response.id);
      deleted_count := deleted_count + 1;
    end if;
  end loop;

  return next;
end;
$$;

do $$
begin
  perform cron.unschedule('svario-apply-response-retention');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'svario-apply-response-retention',
  '15 3 * * *',
  $$select * from app_private.apply_due_response_retention(1000);$$
);

revoke all on table public.survey_privacy_events from anon, authenticated;
grant select on table public.survey_privacy_events to authenticated;
grant select, insert, update, delete on table public.survey_privacy_events to service_role;

revoke all on function app_private.delete_survey_response_tree(uuid) from public;
revoke all on function app_private.get_retention_action_for_response(
  jsonb,
  public.survey_retention_action
) from public;
revoke all on function app_private.apply_due_response_retention(integer) from public;

grant execute on function app_private.apply_due_response_retention(integer)
  to service_role;
