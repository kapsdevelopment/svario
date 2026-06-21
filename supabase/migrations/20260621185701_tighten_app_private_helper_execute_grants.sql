-- Internal authorization helpers are used by RLS policies and privileged RPCs,
-- but should not inherit PostgreSQL's broad PUBLIC function execute default.
-- Public respondent helpers are intentionally left unchanged.

alter default privileges in schema app_private
  revoke execute on functions from public;

alter default privileges in schema app_private
  revoke execute on functions from anon, authenticated, service_role;

revoke execute on function app_private.is_workspace_member(uuid)
  from public;
revoke execute on function app_private.is_workspace_member(uuid)
  from anon;
grant execute on function app_private.is_workspace_member(uuid)
  to authenticated, service_role;

revoke execute on function app_private.has_workspace_role(uuid, public.workspace_member_role[])
  from public;
revoke execute on function app_private.has_workspace_role(uuid, public.workspace_member_role[])
  from anon;
grant execute on function app_private.has_workspace_role(uuid, public.workspace_member_role[])
  to authenticated, service_role;

revoke execute on function app_private.can_create_survey(uuid, uuid, public.survey_visibility)
  from public;
revoke execute on function app_private.can_create_survey(uuid, uuid, public.survey_visibility)
  from anon;
grant execute on function app_private.can_create_survey(uuid, uuid, public.survey_visibility)
  to authenticated, service_role;

revoke execute on function app_private.can_read_survey(uuid)
  from public;
revoke execute on function app_private.can_read_survey(uuid)
  from anon;
grant execute on function app_private.can_read_survey(uuid)
  to authenticated, service_role;

revoke execute on function app_private.can_manage_survey(uuid)
  from public;
revoke execute on function app_private.can_manage_survey(uuid)
  from anon;
grant execute on function app_private.can_manage_survey(uuid)
  to authenticated, service_role;

revoke execute on function app_private.can_delete_survey(uuid)
  from public;
revoke execute on function app_private.can_delete_survey(uuid)
  from anon;
grant execute on function app_private.can_delete_survey(uuid)
  to authenticated, service_role;
