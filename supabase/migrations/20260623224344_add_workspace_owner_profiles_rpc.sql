create or replace function app_private.list_my_workspace_owners()
returns table (
  workspace_id uuid,
  account_id uuid,
  personal_name text,
  contact_email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    owners.workspace_id,
    owners.account_id,
    p.personal_name,
    p.contact_email
  from public.workspace_members me
  join public.workspaces w
    on w.id = me.workspace_id
   and w.status = 'active'
  join public.workspace_members owners
    on owners.workspace_id = me.workspace_id
   and owners.status = 'active'
   and owners.role = 'owner'
  left join public.profiles p
    on p.id = owners.account_id
  where me.account_id = app_private.current_account_id()
    and me.status = 'active'
  order by owners.workspace_id, owners.joined_at, owners.account_id;
$$;

create or replace function public.list_my_workspace_owners()
returns table (
  workspace_id uuid,
  account_id uuid,
  personal_name text,
  contact_email text
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from app_private.list_my_workspace_owners();
$$;

revoke all on function app_private.list_my_workspace_owners()
  from public, anon, authenticated;
revoke all on function public.list_my_workspace_owners()
  from public, anon, authenticated;

grant execute on function app_private.list_my_workspace_owners()
  to authenticated, service_role;
grant execute on function public.list_my_workspace_owners()
  to authenticated, service_role;
