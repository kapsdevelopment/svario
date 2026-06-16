create or replace function app_private.delete_survey_tree(p_survey_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if p_survey_id is null then
    raise exception 'Survey id is required.';
  end if;

  delete from public.answer_options ao
  using public.answers a
  join public.survey_responses sr on sr.id = a.response_id
  where ao.answer_id = a.id
    and sr.survey_id = p_survey_id;

  delete from public.answers a
  using public.survey_responses sr
  where a.response_id = sr.id
    and sr.survey_id = p_survey_id;

  delete from public.survey_responses
  where survey_id = p_survey_id;

  delete from public.question_options qo
  using public.questions q
  where qo.question_id = q.id
    and q.survey_id = p_survey_id;

  delete from public.questions
  where survey_id = p_survey_id;

  delete from public.survey_sections
  where survey_id = p_survey_id;

  delete from public.surveys
  where id = p_survey_id;

  if not found then
    raise exception 'Survey not found.';
  end if;
end;
$$;

create or replace function app_private.delete_survey(p_survey_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.owns_survey(p_survey_id) then
    raise exception 'Survey not found or not owned by current account.';
  end if;

  perform app_private.delete_survey_tree(p_survey_id);
end;
$$;

create or replace function public.delete_survey(p_survey_id uuid)
returns void
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.delete_survey(p_survey_id);
$$;

create or replace function app_private.delete_account_data_for_auth_user(
  p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_account_id uuid;
  v_survey_id uuid;
begin
  if p_auth_user_id is null then
    raise exception 'Auth user id is required.';
  end if;

  select aau.account_id
    into v_account_id
  from public.account_auth_users aau
  where aau.auth_user_id = p_auth_user_id
  limit 1;

  if v_account_id is null then
    return null;
  end if;

  for v_survey_id in
    select s.id
    from public.surveys s
    where s.owner_account_id = v_account_id
  loop
    perform app_private.delete_survey_tree(v_survey_id);
  end loop;

  delete from public.app_users
  where user_id = v_account_id;

  return v_account_id;
end;
$$;

create or replace function public.delete_account_data_for_auth_user(
  p_auth_user_id uuid
)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.delete_account_data_for_auth_user(p_auth_user_id);
$$;

revoke all on function app_private.delete_survey_tree(uuid) from public;
revoke all on function app_private.delete_survey(uuid) from public;
revoke all on function public.delete_survey(uuid) from public;
revoke all on function app_private.delete_account_data_for_auth_user(uuid) from public;
revoke all on function public.delete_account_data_for_auth_user(uuid) from public;

grant execute on function app_private.delete_survey(uuid)
  to authenticated, service_role;
grant execute on function public.delete_survey(uuid)
  to authenticated, service_role;

grant execute on function app_private.delete_account_data_for_auth_user(uuid)
  to service_role;
grant execute on function public.delete_account_data_for_auth_user(uuid)
  to service_role;
