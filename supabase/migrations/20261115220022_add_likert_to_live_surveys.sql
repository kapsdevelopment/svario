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
