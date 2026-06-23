grant execute on function app_private.create_workspace(
  text,
  public.workspace_type,
  text
) to authenticated, service_role;

grant execute on function app_private.create_workspace_invitation(
  uuid,
  public.workspace_member_role,
  integer
) to authenticated, service_role;

grant execute on function app_private.accept_workspace_invitation(text)
  to authenticated, service_role;

grant execute on function app_private.remove_workspace_member(uuid, uuid)
  to authenticated, service_role;

grant execute on function app_private.delete_workspace(uuid)
  to authenticated, service_role;

revoke execute on function app_private.create_workspace(
  text,
  public.workspace_type,
  text
) from anon, public;

revoke execute on function app_private.create_workspace_invitation(
  uuid,
  public.workspace_member_role,
  integer
) from anon, public;

revoke execute on function app_private.accept_workspace_invitation(text)
  from anon, public;

revoke execute on function app_private.remove_workspace_member(uuid, uuid)
  from anon, public;

revoke execute on function app_private.delete_workspace(uuid)
  from anon, public;
