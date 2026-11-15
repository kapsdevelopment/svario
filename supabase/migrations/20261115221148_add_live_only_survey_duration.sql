alter table public.surveys
  add column live_only boolean not null default false,
  add constraint live_only_surveys_use_anonymous_answers_without_dates
    check (not live_only or (response_mode = 'anonymous' and starts_at is null and ends_at is null));

create or replace function app_private.is_survey_publicly_answerable(p_survey_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.surveys s
    where s.id = p_survey_id
      and s.status = 'published'
      and not s.live_only
      and (s.starts_at is null or s.starts_at <= now())
      and (s.ends_at is null or s.ends_at > now())
  );
$$;

drop function public.create_survey_draft(
  uuid, public.survey_visibility, text, text, text, public.survey_response_mode, timestamptz, timestamptz
);

create function public.create_survey_draft(
  p_workspace_id uuid default null,
  p_visibility public.survey_visibility default 'private',
  p_title text default null,
  p_description text default null,
  p_slug text default null,
  p_response_mode public.survey_response_mode default 'anonymous',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_live_only boolean default false
)
returns public.surveys
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
begin
  v_survey := app_private.create_survey_draft(
    p_workspace_id, p_visibility, p_title, p_description, p_slug,
    p_response_mode, p_starts_at, p_ends_at
  );

  if p_live_only then
    update public.surveys
    set live_only = true
    where id = v_survey.id
    returning * into strict v_survey;
  end if;

  return v_survey;
end;
$$;

revoke all on function public.create_survey_draft(
  uuid, public.survey_visibility, text, text, text, public.survey_response_mode, timestamptz, timestamptz, boolean
) from public, anon, authenticated, service_role;

grant execute on function public.create_survey_draft(
  uuid, public.survey_visibility, text, text, text, public.survey_response_mode, timestamptz, timestamptz, boolean
) to authenticated, service_role;

create or replace function public.repeat_survey_once(p_survey_id uuid)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_new_survey_id uuid;
begin
  v_new_survey_id := app_private.repeat_survey_once(p_survey_id);

  if exists (select 1 from public.surveys where id = p_survey_id and live_only) then
    update public.surveys set live_only = true where id = v_new_survey_id;
  end if;

  return v_new_survey_id;
end;
$$;

create or replace function app_private.start_live_survey(p_survey_id uuid)
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

  if (v_survey.status <> 'published' and not (v_survey.live_only and v_survey.status = 'draft'))
    or v_survey.response_mode <> 'anonymous'
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
      'scaleVariant', q.scale_variant,
      'options', choices.options
    ) order by ss.sort_order nulls last, q.sort_order),
    bool_and(
      choices.option_count >= 2
      and (q.type = 'likert_scale' or (q.type = 'multiple_choice' and not q.allow_multiple))
    )
  into v_questions, v_supported
  from public.questions q
  left join public.survey_sections ss on ss.id = q.section_id
  cross join lateral (
    select jsonb_agg(entry.option order by entry.sort_order) as options, count(*) as option_count
    from (
      select jsonb_build_object('id', o.id, 'label', o.label) as option, o.sort_order
      from public.question_options o
      where q.type = 'multiple_choice' and o.question_id = q.id

      union all

      -- Freeze the numeric choices so the existing vote RPC validates them by ID.
      select jsonb_build_object(
        'id', extensions.gen_random_uuid(), 'label', scale.value::text, 'value', scale.value
      ), scale.value
      from generate_series(q.scale_min::integer, q.scale_max::integer) as scale(value)
      where q.type = 'likert_scale'
    ) entry
  ) choices
  where q.survey_id = p_survey_id;

  if v_questions is null or jsonb_array_length(v_questions) > 250 then
    raise exception 'Liveøkter krever mellom 1 og 250 spørsmål.';
  end if;
  if not v_supported then
    raise exception 'Bruk skala eller flervalg med minst to svaralternativer og «Flere valg» avslått.';
  end if;

  if v_survey.status = 'draft' then
    perform app_private.publish_survey(v_survey.id);
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
