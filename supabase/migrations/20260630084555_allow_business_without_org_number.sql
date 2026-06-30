alter table public.workspaces
  drop constraint if exists workspaces_business_requires_org_number;

alter table public.workspaces
  add constraint workspaces_organization_number_matches_type check (
    (
      type = 'business'
      and (
        organization_number is null
        or organization_number ~ '^[0-9]{9}$'
      )
    )
    or (
      type = 'team'
      and organization_number is null
    )
  );

create or replace function app_private.create_workspace(
  p_name text,
  p_type public.workspace_type,
  p_organization_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, app_private
as $$
declare
  v_account_id uuid := app_private.current_account_id();
  v_name text := nullif(btrim(p_name), '');
  v_organization_number text;
  v_slug_base text;
  v_slug text;
  v_workspace_id uuid;
  v_attempt integer := 0;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if v_name is null then
    raise exception 'Workspace name is required.';
  end if;

  v_organization_number := nullif(
    regexp_replace(coalesce(p_organization_number, ''), '\D', '', 'g'),
    ''
  );

  if p_type = 'business'
     and v_organization_number is not null
     and v_organization_number !~ '^[0-9]{9}$' then
    raise exception 'Organization number must be 9 digits.';
  end if;

  if p_type = 'team' then
    v_organization_number := null;
  end if;

  v_slug_base := app_private.normalize_workspace_slug(v_name);

  loop
    v_slug := case
      when v_attempt = 0 then v_slug_base
      else v_slug_base || '-' || substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 6)
    end;

    begin
      insert into public.workspaces (
        type,
        name,
        slug,
        organization_number,
        created_by_account_id
      )
      values (
        p_type,
        v_name,
        v_slug,
        v_organization_number,
        v_account_id
      )
      returning id into v_workspace_id;

      exit;
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt > 8 then
          raise;
        end if;
    end;
  end loop;

  insert into public.workspace_members (
    workspace_id,
    account_id,
    role,
    status
  )
  values (
    v_workspace_id,
    v_account_id,
    'owner',
    'active'
  );

  return v_workspace_id;
end;
$$;

create or replace function app_private.set_workspace_organization_number(
  p_workspace_id uuid,
  p_organization_number text
)
returns public.workspaces
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_organization_number text := nullif(
    regexp_replace(coalesce(p_organization_number, ''), '\D', '', 'g'),
    ''
  );
  v_workspace public.workspaces%rowtype;
begin
  if p_workspace_id is null then
    raise exception 'Workspace id is required.';
  end if;

  if v_organization_number is null
     or v_organization_number !~ '^[0-9]{9}$' then
    raise exception 'Organization number must be 9 digits.';
  end if;

  if not app_private.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Only workspace owners and admins can update organization number.';
  end if;

  select *
    into v_workspace
  from public.workspaces
  where id = p_workspace_id
  for update;

  if v_workspace.id is null then
    raise exception 'Workspace not found.';
  end if;

  if v_workspace.status <> 'active' then
    raise exception 'Workspace not found.';
  end if;

  if v_workspace.type <> 'business' then
    raise exception 'Only business workspaces can have an organization number.';
  end if;

  if v_workspace.organization_number is not null
     and v_workspace.organization_number <> v_organization_number then
    raise exception 'Workspace already has an organization number.';
  end if;

  update public.workspaces
  set
    organization_number = v_organization_number,
    verified_at = null,
    updated_at = now()
  where id = p_workspace_id
  returning * into v_workspace;

  return v_workspace;
end;
$$;

create or replace function public.set_workspace_organization_number(
  p_workspace_id uuid,
  p_organization_number text
)
returns public.workspaces
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.set_workspace_organization_number(
    p_workspace_id,
    p_organization_number
  );
$$;

revoke all on function public.set_workspace_organization_number(uuid, text)
  from public;

grant execute on function public.set_workspace_organization_number(uuid, text)
  to authenticated, service_role;

grant execute on function app_private.set_workspace_organization_number(uuid, text)
  to authenticated, service_role;

revoke execute on function app_private.set_workspace_organization_number(uuid, text)
  from anon, public;
