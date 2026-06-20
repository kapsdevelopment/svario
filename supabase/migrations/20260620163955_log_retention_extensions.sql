drop function if exists public.update_survey_privacy_settings(
  uuid,
  boolean,
  boolean,
  text,
  text,
  text,
  public.survey_legal_basis,
  text,
  text,
  integer,
  public.survey_retention_action,
  text
);

drop function if exists app_private.update_survey_privacy_settings(
  uuid,
  boolean,
  boolean,
  text,
  text,
  text,
  public.survey_legal_basis,
  text,
  text,
  integer,
  public.survey_retention_action,
  text
);

create or replace function app_private.update_survey_privacy_settings(
  p_survey_id uuid,
  p_enabled boolean,
  p_personal_data_expected boolean,
  p_controller_name text default null,
  p_controller_contact text default null,
  p_purpose text default null,
  p_legal_basis public.survey_legal_basis default null,
  p_legal_basis_note text default null,
  p_consent_text text default null,
  p_retention_days integer default null,
  p_retention_action public.survey_retention_action default 'delete_response',
  p_respondent_notice text default null,
  p_retention_change_reason text default null
)
returns public.survey_privacy_settings
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_previous_settings public.survey_privacy_settings%rowtype;
  v_settings public.survey_privacy_settings%rowtype;
  v_retention_change_reason text := nullif(
    btrim(coalesce(p_retention_change_reason, '')),
    ''
  );
  v_retention_extended boolean := false;
  v_existing_response_count integer := 0;
  v_affected_response_count integer := 0;
begin
  if p_survey_id is null then
    raise exception 'Survey id is required.';
  end if;

  if not app_private.can_manage_survey(p_survey_id) then
    raise exception 'Survey not found or not manageable by current account.';
  end if;

  select ps.*
    into v_previous_settings
  from public.survey_privacy_settings ps
  where ps.survey_id = p_survey_id;

  select count(*)
    into v_existing_response_count
  from public.survey_responses sr
  where sr.survey_id = p_survey_id
    and sr.anonymized_at is null;

  v_retention_extended :=
    found
    and coalesce(p_enabled, false)
    and v_existing_response_count > 0
    and v_previous_settings.retention_days is not null
    and p_retention_days is not null
    and p_retention_days > v_previous_settings.retention_days;

  if v_retention_extended and v_retention_change_reason is null then
    raise exception 'Begrunnelse er påkrevd når lagringstiden forlenges.';
  end if;

  insert into public.survey_privacy_settings (
    survey_id,
    enabled,
    personal_data_expected,
    controller_name,
    controller_contact,
    purpose,
    legal_basis,
    legal_basis_note,
    consent_text,
    retention_days,
    retention_action,
    respondent_notice
  )
  values (
    p_survey_id,
    coalesce(p_enabled, false),
    coalesce(p_personal_data_expected, false),
    nullif(btrim(coalesce(p_controller_name, '')), ''),
    nullif(btrim(coalesce(p_controller_contact, '')), ''),
    nullif(btrim(coalesce(p_purpose, '')), ''),
    p_legal_basis,
    nullif(btrim(coalesce(p_legal_basis_note, '')), ''),
    case
      when p_legal_basis = 'consent'
        then nullif(btrim(coalesce(p_consent_text, '')), '')
      else null
    end,
    p_retention_days,
    coalesce(p_retention_action, 'delete_response'::public.survey_retention_action),
    nullif(btrim(coalesce(p_respondent_notice, '')), '')
  )
  on conflict (survey_id) do update
  set
    enabled = excluded.enabled,
    personal_data_expected = excluded.personal_data_expected,
    controller_name = excluded.controller_name,
    controller_contact = excluded.controller_contact,
    purpose = excluded.purpose,
    legal_basis = excluded.legal_basis,
    legal_basis_note = excluded.legal_basis_note,
    consent_text = excluded.consent_text,
    retention_days = excluded.retention_days,
    retention_action = excluded.retention_action,
    respondent_notice = excluded.respondent_notice
  returning * into v_settings;

  update public.survey_responses sr
  set retention_due_at = case
    when v_settings.enabled and v_settings.retention_days is not null
      then sr.submitted_at + make_interval(days => v_settings.retention_days)
    else null
  end
  where sr.survey_id = p_survey_id
    and sr.anonymized_at is null;

  get diagnostics v_affected_response_count = row_count;

  if v_retention_extended then
    insert into public.survey_privacy_events (
      survey_id,
      event_type,
      details
    )
    values (
      p_survey_id,
      'retention_extended',
      jsonb_build_object(
        'previousRetentionDays', v_previous_settings.retention_days,
        'newRetentionDays', v_settings.retention_days,
        'reason', v_retention_change_reason,
        'affectedResponseCount', v_affected_response_count,
        'changedByAccountId', app_private.current_account_id()
      )
    );
  end if;

  return v_settings;
end;
$$;

create or replace function public.update_survey_privacy_settings(
  p_survey_id uuid,
  p_enabled boolean,
  p_personal_data_expected boolean,
  p_controller_name text default null,
  p_controller_contact text default null,
  p_purpose text default null,
  p_legal_basis public.survey_legal_basis default null,
  p_legal_basis_note text default null,
  p_consent_text text default null,
  p_retention_days integer default null,
  p_retention_action public.survey_retention_action default 'delete_response',
  p_respondent_notice text default null,
  p_retention_change_reason text default null
)
returns public.survey_privacy_settings
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.update_survey_privacy_settings(
    p_survey_id,
    p_enabled,
    p_personal_data_expected,
    p_controller_name,
    p_controller_contact,
    p_purpose,
    p_legal_basis,
    p_legal_basis_note,
    p_consent_text,
    p_retention_days,
    p_retention_action,
    p_respondent_notice,
    p_retention_change_reason
  );
$$;

revoke all on function app_private.update_survey_privacy_settings(
  uuid,
  boolean,
  boolean,
  text,
  text,
  text,
  public.survey_legal_basis,
  text,
  text,
  integer,
  public.survey_retention_action,
  text,
  text
) from public;

revoke all on function public.update_survey_privacy_settings(
  uuid,
  boolean,
  boolean,
  text,
  text,
  text,
  public.survey_legal_basis,
  text,
  text,
  integer,
  public.survey_retention_action,
  text,
  text
) from public;

grant execute on function app_private.update_survey_privacy_settings(
  uuid,
  boolean,
  boolean,
  text,
  text,
  text,
  public.survey_legal_basis,
  text,
  text,
  integer,
  public.survey_retention_action,
  text,
  text
) to authenticated, service_role;

grant execute on function public.update_survey_privacy_settings(
  uuid,
  boolean,
  boolean,
  text,
  text,
  text,
  public.survey_legal_basis,
  text,
  text,
  integer,
  public.survey_retention_action,
  text,
  text
) to authenticated, service_role;
