create table app_private.live_survey_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  title text not null,
  questions jsonb not null,
  privacy jsonb not null,
  step integer not null default -1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  purge_at timestamptz not null
);

create unique index live_survey_sessions_one_open_idx
  on app_private.live_survey_sessions (survey_id) where closed_at is null;
create index live_survey_sessions_survey_created_idx
  on app_private.live_survey_sessions (survey_id, created_at desc);
create index live_survey_sessions_purge_idx
  on app_private.live_survey_sessions (purge_at);

create table app_private.live_survey_votes (
  session_id uuid not null references app_private.live_survey_sessions(id) on delete cascade,
  step integer not null,
  voter_hash bytea not null,
  option_id uuid not null,
  primary key (session_id, step, voter_hash)
);

alter table app_private.live_survey_sessions enable row level security;
alter table app_private.live_survey_votes enable row level security;
revoke all on app_private.live_survey_sessions, app_private.live_survey_votes
  from public, anon, authenticated;

create function app_private.can_host_live_survey(p_survey_id uuid)
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = app_private.current_account_id() and a.status = 'active'
  ) and app_private.can_manage_survey(p_survey_id);
$$;

create function app_private.start_live_survey(p_survey_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
  v_privacy public.survey_privacy_settings%rowtype;
  v_questions jsonb;
  v_supported boolean;
  v_session_id uuid;
  v_now timestamptz := statement_timestamp();
  v_expires_at timestamptz;
  v_retention_days integer;
begin
  if not app_private.can_host_live_survey(p_survey_id) then
    raise exception 'Du har ikke tilgang til å styre liveøkter for dette skjemaet.';
  end if;

  -- Serialize starts for the same survey and return the existing room on retry.
  select * into v_survey from public.surveys where id = p_survey_id for no key update;
  if not found then
    raise exception 'Fant ikke skjemaet.';
  end if;

  select id into v_session_id from app_private.live_survey_sessions
  where survey_id = p_survey_id and closed_at is null and expires_at > v_now;
  if found then
    return v_session_id;
  end if;

  if v_survey.status <> 'published' or v_survey.response_mode <> 'anonymous'
    or v_survey.starts_at > v_now or v_survey.ends_at <= v_now then
    raise exception 'Liveøkter krever et publisert, åpent skjema med anonyme svar.';
  end if;

  select * into v_privacy from public.survey_privacy_settings where survey_id = p_survey_id;
  if v_privacy.enabled and (v_privacy.personal_data_expected or v_privacy.legal_basis = 'consent') then
    raise exception 'Liveøkter støtter skjema uten personopplysninger eller krav om samtykke.';
  end if;

  select
    jsonb_agg(jsonb_build_object(
      'id', q.id, 'prompt', q.prompt, 'description', q.description,
      'chartType', case when q.visualization_type = 'pie' then 'pie' else 'bar' end,
      'colorMode', q.visualization_color_mode,
      'options', choices.options
    ) order by ss.sort_order nulls last, q.sort_order),
    bool_and(q.type = 'multiple_choice' and not q.allow_multiple and choices.option_count >= 2)
  into v_questions, v_supported
  from public.questions q
  left join public.survey_sections ss on ss.id = q.section_id
  cross join lateral (
    select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label) order by o.sort_order) as options,
      count(*) as option_count
    from public.question_options o where o.question_id = q.id
  ) choices
  where q.survey_id = p_survey_id;

  if v_supported is distinct from true or jsonb_array_length(v_questions) > 250 then
    raise exception 'Liveøkter krever 1–250 flervalgsspørsmål med ett mulig svar per spørsmål.';
  end if;

  v_expires_at := least(v_now + interval '8 hours', v_survey.ends_at);
  v_retention_days := case when v_privacy.enabled then least(30, v_privacy.retention_days) else 30 end;

  update app_private.live_survey_sessions set closed_at = expires_at
  where survey_id = p_survey_id and closed_at is null and expires_at <= v_now;

  insert into app_private.live_survey_sessions (
    survey_id, title, questions, privacy, expires_at, purge_at
  ) values (
    p_survey_id, v_survey.title, v_questions,
    jsonb_build_object(
      'retentionDays', v_retention_days,
      'controllerName', case when v_privacy.enabled then v_privacy.controller_name end,
      'controllerContact', case when v_privacy.enabled then v_privacy.controller_contact end,
      'purpose', case when v_privacy.enabled then v_privacy.purpose end,
      'legalBasis', case when v_privacy.enabled then v_privacy.legal_basis end,
      'respondentNotice', case when v_privacy.enabled then v_privacy.respondent_notice end
    ), v_expires_at, v_now + make_interval(days => v_retention_days)
  ) returning id into v_session_id;

  return v_session_id;
end;
$$;

create function app_private.list_live_survey_sessions(p_survey_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not app_private.can_host_live_survey(p_survey_id) then
    raise exception 'Du har ikke tilgang til å se liveøkter for dette skjemaet.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'createdAt', s.created_at,
      'status', case
        when s.closed_at is not null or s.expires_at <= statement_timestamp() then 'closed'
        when s.step = -1 then 'lobby' else 'question'
      end
    ) order by s.created_at desc)
    from (
      select * from app_private.live_survey_sessions
      where survey_id = p_survey_id and purge_at > statement_timestamp()
      order by created_at desc limit 10
    ) s
  ), '[]'::jsonb);
end;
$$;

create function app_private.get_live_survey_host(p_session_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_session app_private.live_survey_sessions%rowtype;
  v_closed boolean;
  v_results jsonb;
begin
  select * into v_session from app_private.live_survey_sessions
  where id = p_session_id and purge_at > statement_timestamp();

  if not found or not app_private.can_host_live_survey(v_session.survey_id) then
    return null;
  end if;

  v_closed := v_session.closed_at is not null or v_session.expires_at <= statement_timestamp();
  select coalesce(jsonb_agg(jsonb_build_object(
    'step', q.position - 1, 'question', q.question, 'counts', coalesce(totals.counts, '{}'::jsonb)
  ) order by q.position), '[]'::jsonb)
  into v_results
  from jsonb_array_elements(v_session.questions) with ordinality q(question, position)
  cross join lateral (
    select jsonb_object_agg(option_id, vote_count) as counts
    from (
      select option_id, count(*) as vote_count from app_private.live_survey_votes
      where session_id = p_session_id and step = q.position - 1
      group by option_id
    ) t
  ) totals
  where (v_closed and q.position <= v_session.step + 1) or q.position = v_session.step + 1;

  return jsonb_build_object(
    'id', v_session.id, 'surveyId', v_session.survey_id, 'title', v_session.title,
    'status', case when v_closed then 'closed' when v_session.step = -1 then 'lobby' else 'question' end,
    'step', v_session.step, 'questionCount', jsonb_array_length(v_session.questions),
    'results', v_results
  );
end;
$$;

create function app_private.advance_live_survey(p_session_id uuid, p_step integer, p_finish boolean)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session app_private.live_survey_sessions%rowtype;
begin
  select * into v_session from app_private.live_survey_sessions where id = p_session_id;
  if not found or not app_private.can_host_live_survey(v_session.survey_id) then
    raise exception 'Du har ikke tilgang til å styre denne liveøkten.';
  end if;

  select * into v_session from app_private.live_survey_sessions where id = p_session_id for no key update;
  if not found or v_session.closed_at is not null or v_session.expires_at <= clock_timestamp() then
    raise exception 'Liveøkten er avsluttet.';
  end if;
  if p_step is distinct from v_session.step then
    raise exception 'Liveøkten har gått videre. Se gjeldende spørsmål og prøv igjen.';
  end if;

  if p_finish or v_session.step + 1 >= jsonb_array_length(v_session.questions) then
    update app_private.live_survey_sessions set closed_at = clock_timestamp() where id = p_session_id;
  else
    update app_private.live_survey_sessions set step = step + 1 where id = p_session_id;
  end if;

  return app_private.get_live_survey_host(p_session_id);
end;
$$;

create function app_private.live_survey_voter_hash(p_session_id uuid, p_step integer, p_voter_key uuid)
returns bytea
language sql immutable strict
set search_path = ''
as $$
  select extensions.digest(p_session_id::text || ':' || p_step::text || ':' || p_voter_key::text, 'sha256');
$$;

create function app_private.get_live_survey_status(p_session_id uuid, p_voter_key uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', s.title, 'step', s.step, 'questionCount', jsonb_array_length(s.questions),
    'status', state.status, 'privacy', s.privacy,
    'question', case when state.status = 'question' then s.questions -> s.step end,
    'selectedOptionId', case when state.status = 'question' then (
      select v.option_id from app_private.live_survey_votes v
      where v.session_id = s.id and v.step = s.step
        and v.voter_hash = app_private.live_survey_voter_hash(s.id, s.step, p_voter_key)
    ) end
  )
  from app_private.live_survey_sessions s
  cross join lateral (
    select case
      when s.closed_at is not null or s.expires_at <= statement_timestamp() then 'closed'
      when s.step = -1 then 'lobby' else 'question'
    end as status
  ) state
  where s.id = p_session_id and s.purge_at > statement_timestamp();
$$;

create function app_private.submit_live_survey_vote(
  p_session_id uuid, p_step integer, p_question_id uuid, p_option_id uuid, p_voter_key uuid
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_session app_private.live_survey_sessions%rowtype;
  v_question jsonb;
  v_hash bytea := app_private.live_survey_voter_hash(p_session_id, p_step, p_voter_key);
  v_saved_option uuid;
begin
  if v_hash is null or p_step < 0 or p_question_id is null or p_option_id is null then
    raise exception 'Svaret er ikke gyldig.';
  end if;

  -- Votes share the lock; the host takes a conflicting lock to advance or close.
  select * into v_session from app_private.live_survey_sessions
  where id = p_session_id for share;
  if not found then
    raise exception 'Fant ikke liveøkten.';
  end if;

  v_question := v_session.questions -> p_step;
  if (v_question ->> 'id')::uuid is distinct from p_question_id
    or not coalesce(v_question -> 'options' @> jsonb_build_array(jsonb_build_object('id', p_option_id)), false) then
    raise exception 'Svaret hører ikke til dette spørsmålet.';
  end if;

  select option_id into v_saved_option from app_private.live_survey_votes
  where session_id = p_session_id and step = p_step and voter_hash = v_hash;
  if found then
    return v_saved_option;
  end if;

  if v_session.closed_at is not null or v_session.expires_at <= clock_timestamp()
    or v_session.step <> p_step then
    raise exception 'Spørsmålet er stengt for svar.';
  end if;

  insert into app_private.live_survey_votes (session_id, step, voter_hash, option_id)
  values (p_session_id, p_step, v_hash, p_option_id)
  on conflict (session_id, step, voter_hash) do nothing
  returning option_id into v_saved_option;

  if not found then
    select option_id into v_saved_option from app_private.live_survey_votes
    where session_id = p_session_id and step = p_step and voter_hash = v_hash;
  end if;

  return v_saved_option;
end;
$$;

create function public.start_live_survey(p_survey_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.start_live_survey(p_survey_id); $$;

create function public.list_live_survey_sessions(p_survey_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select app_private.list_live_survey_sessions(p_survey_id); $$;

create function public.get_live_survey_host(p_session_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select app_private.get_live_survey_host(p_session_id); $$;

create function public.advance_live_survey(p_session_id uuid, p_step integer, p_finish boolean)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.advance_live_survey(p_session_id, p_step, p_finish); $$;

create function public.get_live_survey_status(p_session_id uuid, p_voter_key uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select app_private.get_live_survey_status(p_session_id, p_voter_key); $$;

create function public.submit_live_survey_vote(
  p_session_id uuid, p_step integer, p_question_id uuid, p_option_id uuid, p_voter_key uuid
)
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.submit_live_survey_vote(p_session_id, p_step, p_question_id, p_option_id, p_voter_key); $$;

revoke execute on function
  app_private.can_host_live_survey(uuid),
  app_private.live_survey_voter_hash(uuid, integer, uuid),
  app_private.start_live_survey(uuid), public.start_live_survey(uuid),
  app_private.list_live_survey_sessions(uuid), public.list_live_survey_sessions(uuid),
  app_private.get_live_survey_host(uuid), public.get_live_survey_host(uuid),
  app_private.advance_live_survey(uuid, integer, boolean), public.advance_live_survey(uuid, integer, boolean),
  app_private.get_live_survey_status(uuid, uuid), public.get_live_survey_status(uuid, uuid),
  app_private.submit_live_survey_vote(uuid, integer, uuid, uuid, uuid),
  public.submit_live_survey_vote(uuid, integer, uuid, uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function
  app_private.start_live_survey(uuid), public.start_live_survey(uuid),
  app_private.list_live_survey_sessions(uuid), public.list_live_survey_sessions(uuid),
  app_private.get_live_survey_host(uuid), public.get_live_survey_host(uuid),
  app_private.advance_live_survey(uuid, integer, boolean), public.advance_live_survey(uuid, integer, boolean)
to authenticated;

grant execute on function
  app_private.get_live_survey_status(uuid, uuid), public.get_live_survey_status(uuid, uuid),
  app_private.submit_live_survey_vote(uuid, integer, uuid, uuid, uuid),
  public.submit_live_survey_vote(uuid, integer, uuid, uuid, uuid)
to anon;

select cron.schedule(
  'svario-purge-live-surveys', '*/15 * * * *',
  $$delete from app_private.live_survey_sessions where purge_at <= now();$$
);
