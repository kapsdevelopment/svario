-- Retention may remove answers, but a survey that has received answers cannot become a draft again.
create table app_private.answered_surveys (
  survey_id uuid primary key references public.surveys(id) on delete cascade
);
alter table app_private.answered_surveys enable row level security;
revoke all on app_private.answered_surveys from public, anon, authenticated;

create function app_private.record_survey_response()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
begin
  -- Share the lock with other respondents and serialize with publication changes.
  select * into v_survey from public.surveys where id = new.survey_id for share;
  if not found or v_survey.status <> 'published' or v_survey.live_only
    or v_survey.starts_at > clock_timestamp() or v_survey.ends_at <= clock_timestamp() then
    raise exception 'Survey is not available for responses.';
  end if;

  insert into app_private.answered_surveys (survey_id) values (new.survey_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger survey_responses_check_publication
before insert on public.survey_responses
for each row execute function app_private.record_survey_response();

create function app_private.record_live_survey_response()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_survey_id uuid;
begin
  -- Votes already hold a session lock. Do not wait for a survey being deleted,
  -- since the delete also has to remove the session.
  select s.id into v_survey_id
  from app_private.live_survey_sessions l
  join public.surveys s on s.id = l.survey_id
  where l.id = new.session_id
  for key share of s nowait;

  insert into app_private.answered_surveys (survey_id)
  values (v_survey_id)
  on conflict do nothing;
  return new;
exception when lock_not_available then
  raise exception 'Liveøkten er ikke tilgjengelig for svar.';
end;
$$;

create trigger live_survey_votes_record_response
after insert on app_private.live_survey_votes
for each row execute function app_private.record_live_survey_response();

insert into app_private.answered_surveys (survey_id)
select survey_id from public.survey_responses
union
select s.survey_id
from app_private.live_survey_sessions s
where exists (select 1 from app_private.live_survey_votes v where v.session_id = s.id)
on conflict do nothing;

create function app_private.list_survey_publication_actions(p_survey_ids uuid[])
returns table (survey_id uuid, action text)
language sql stable security definer
set search_path = ''
as $$
  select s.id, case when a.survey_id is null then 'unpublish' else 'close' end
  from public.surveys s
  left join app_private.answered_surveys a on a.survey_id = s.id
  where s.id = any(p_survey_ids) and s.status = 'published'
    and app_private.can_host_live_survey(s.id)
    and not exists (
      select 1 from app_private.live_survey_sessions l
      where l.survey_id = s.id and l.closed_at is null and l.expires_at > statement_timestamp()
    );
$$;

create function app_private.stop_survey_publication(p_survey_id uuid, p_action text)
returns public.surveys
language plpgsql security definer
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
  v_expires_at timestamptz;
  v_answered boolean;
begin
  if not app_private.can_host_live_survey(p_survey_id) then
    raise exception 'Survey not found or not manageable by current account.';
  end if;

  select * into v_survey from public.surveys where id = p_survey_id for no key update;
  if not found or v_survey.status <> 'published' then
    raise exception 'Skjemaet er ikke lenger publisert.';
  end if;

  -- The survey lock prevents a concurrent live start. For an expired room,
  -- wait for votes that began before expiry before checking for answers.
  select expires_at into v_expires_at from app_private.live_survey_sessions
  where survey_id = p_survey_id and closed_at is null;
  if v_expires_at > clock_timestamp() then
    raise exception 'Avslutt den aktive liveøkten før du endrer publiseringen.';
  end if;
  perform 1 from app_private.live_survey_sessions
  where survey_id = p_survey_id and closed_at is null for no key update;

  select exists (
    select 1 from app_private.answered_surveys where survey_id = p_survey_id
  ) into v_answered;

  if p_action = 'unpublish' and v_answered then
    raise exception 'Skjemaet har fått svar. Velg «Steng for nye svar» for å beholde dem.';
  elsif p_action = 'unpublish' then
    update public.surveys set status = 'draft', published_at = null, closed_at = null
    where id = p_survey_id returning * into v_survey;
  elsif p_action = 'close' and v_answered then
    update public.surveys set status = 'closed', closed_at = now()
    where id = p_survey_id returning * into v_survey;
  else
    raise exception 'Denne handlingen er ikke tilgjengelig for skjemaet.';
  end if;

  return v_survey;
end;
$$;

create function public.list_survey_publication_actions(p_survey_ids uuid[])
returns table (survey_id uuid, action text)
language sql stable security invoker
set search_path = ''
as $$ select * from app_private.list_survey_publication_actions(p_survey_ids); $$;

create function public.stop_survey_publication(p_survey_id uuid, p_action text)
returns public.surveys
language sql security invoker
set search_path = ''
as $$ select app_private.stop_survey_publication(p_survey_id, p_action); $$;

revoke all on function app_private.record_survey_response(), app_private.record_live_survey_response()
  from public, anon, authenticated;
revoke all on function
  app_private.list_survey_publication_actions(uuid[]), public.list_survey_publication_actions(uuid[]),
  app_private.stop_survey_publication(uuid, text), public.stop_survey_publication(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function
  app_private.list_survey_publication_actions(uuid[]), public.list_survey_publication_actions(uuid[]),
  app_private.stop_survey_publication(uuid, text), public.stop_survey_publication(uuid, text)
  to authenticated;

-- Publication changes go through the RPCs. Ordinary editor updates still use RLS.
revoke update on public.surveys from authenticated;
grant update (title, description, response_mode, starts_at, ends_at, live_only, workspace_id, visibility)
  on public.surveys to authenticated;
