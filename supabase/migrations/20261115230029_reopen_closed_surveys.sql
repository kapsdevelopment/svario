create or replace function app_private.list_survey_publication_actions(p_survey_ids uuid[])
returns table (survey_id uuid, action text)
language sql stable security definer
set search_path = ''
as $$
  select s.id, case
    when s.status = 'closed' then 'reopen'
    when a.survey_id is null then 'unpublish'
    else 'close'
  end
  from public.surveys s
  left join app_private.answered_surveys a on a.survey_id = s.id
  where s.id = any(p_survey_ids)
    and (s.status = 'published' or (s.status = 'closed' and not s.live_only))
    and app_private.can_host_live_survey(s.id)
    and not exists (
      select 1 from app_private.live_survey_sessions l
      where l.survey_id = s.id and l.closed_at is null and l.expires_at > statement_timestamp()
    );
$$;

create function app_private.reopen_survey(p_survey_id uuid)
returns public.surveys
language plpgsql security definer
set search_path = ''
as $$
declare
  v_survey public.surveys%rowtype;
begin
  if not app_private.can_host_live_survey(p_survey_id) then
    raise exception 'Survey not found or not manageable by current account.';
  end if;

  select * into v_survey
  from public.surveys where id = p_survey_id for no key update;
  if not found or v_survey.status <> 'closed' then
    raise exception 'Bare stengte skjemaer kan åpnes på nytt.';
  end if;

  if v_survey.live_only then
    raise exception 'Et skjema for liveøkt kan ikke åpnes med en vanlig respondentlenke.';
  end if;

  if v_survey.ends_at <= clock_timestamp() then
    raise exception 'Sluttdatoen har passert. Endre den under Varighet før du åpner skjemaet på nytt.';
  end if;

  if v_survey.starts_at > clock_timestamp() then
    raise exception 'Startdatoen ligger frem i tid. Endre den under Varighet før du åpner skjemaet på nytt.';
  end if;

  update public.surveys set status = 'published', closed_at = null
  where id = p_survey_id returning * into v_survey;

  return v_survey;
end;
$$;

create function public.reopen_survey(p_survey_id uuid)
returns public.surveys
language sql security invoker
set search_path = ''
as $$ select app_private.reopen_survey(p_survey_id); $$;

revoke all on function app_private.reopen_survey(uuid), public.reopen_survey(uuid)
  from public, anon, authenticated, service_role;
grant execute on function app_private.reopen_survey(uuid), public.reopen_survey(uuid)
  to authenticated;
