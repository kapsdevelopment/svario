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
  p_respondent_notice text default null
)
returns public.survey_privacy_settings
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_settings public.survey_privacy_settings%rowtype;
begin
  if p_survey_id is null then
    raise exception 'Survey id is required.';
  end if;

  if not app_private.can_manage_survey(p_survey_id) then
    raise exception 'Survey not found or not manageable by current account.';
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
  p_respondent_notice text default null
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
    p_respondent_notice
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
  text
) to authenticated, service_role;
