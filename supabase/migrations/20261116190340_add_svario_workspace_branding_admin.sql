create table app_private.svario_admins (
  account_id uuid primary key references public.accounts(id) on delete cascade
);

alter table app_private.svario_admins enable row level security;
revoke all on app_private.svario_admins from public, anon, authenticated, service_role;

create function app_private.is_svario_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.svario_admins a
    join public.accounts ac on ac.id = a.account_id
    where a.account_id = app_private.current_account_id()
      and ac.status = 'active'
  );
$$;

create function app_private.require_svario_admin()
returns void
language plpgsql stable security invoker
set search_path = ''
as $$
begin
  if not app_private.is_svario_admin() then
    raise exception 'Svario admin access is required.' using errcode = '42501';
  end if;
end;
$$;

create function app_private.list_branding_workspaces(p_search text)
returns table (id uuid, name text, slug text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_search text := lower(btrim(coalesce(p_search, '')));
begin
  perform app_private.require_svario_admin();

  return query
  select w.id, w.name, w.slug
  from public.workspaces w
  where w.status = 'active'
    and (v_search = '' or strpos(lower(w.name), v_search) > 0 or strpos(w.slug, v_search) > 0)
  order by w.name, w.slug
  limit 50;
end;
$$;

create function app_private.get_workspace_respondent_branding(p_workspace_id uuid)
returns table (display_name text, accent_color text, logo_png_base64 text, is_active boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform app_private.require_svario_admin();

  return query
  select btrim(b.display_name), b.accent_color, replace(encode(b.logo_png, 'base64'), chr(10), ''), b.is_active
  from app_private.workspace_respondent_branding b
  join public.workspaces w on w.id = b.workspace_id and w.status = 'active'
  where b.workspace_id = p_workspace_id;
end;
$$;

create function app_private.set_workspace_respondent_branding_active(p_workspace_id uuid, p_is_active boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_is_active boolean;
begin
  perform app_private.require_svario_admin();

  update app_private.workspace_respondent_branding b
  set is_active = p_is_active
  from public.workspaces w
  where b.workspace_id = p_workspace_id and w.id = b.workspace_id and w.status = 'active'
  returning b.is_active into v_is_active;

  if not found then
    raise exception 'Workspace branding profile not found.' using errcode = 'P0002';
  end if;

  return v_is_active;
end;
$$;

create function public.is_svario_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select app_private.is_svario_admin(); $$;

create function public.list_branding_workspaces(p_search text)
returns table (id uuid, name text, slug text)
language sql stable security invoker
set search_path = ''
as $$ select * from app_private.list_branding_workspaces(p_search); $$;

create function public.get_workspace_respondent_branding(p_workspace_id uuid)
returns table (display_name text, accent_color text, logo_png_base64 text, is_active boolean)
language sql stable security invoker
set search_path = ''
as $$ select * from app_private.get_workspace_respondent_branding(p_workspace_id); $$;

create function public.set_workspace_respondent_branding_active(p_workspace_id uuid, p_is_active boolean)
returns boolean
language sql security invoker
set search_path = ''
as $$ select app_private.set_workspace_respondent_branding_active(p_workspace_id, p_is_active); $$;

revoke all on function app_private.require_svario_admin(),
  app_private.is_svario_admin(), public.is_svario_admin(),
  app_private.list_branding_workspaces(text), public.list_branding_workspaces(text),
  app_private.get_workspace_respondent_branding(uuid), public.get_workspace_respondent_branding(uuid),
  app_private.set_workspace_respondent_branding_active(uuid, boolean),
  public.set_workspace_respondent_branding_active(uuid, boolean) from public, anon, authenticated, service_role;

grant execute on function app_private.is_svario_admin(), public.is_svario_admin(),
  app_private.list_branding_workspaces(text), public.list_branding_workspaces(text),
  app_private.get_workspace_respondent_branding(uuid), public.get_workspace_respondent_branding(uuid),
  app_private.set_workspace_respondent_branding_active(uuid, boolean),
  public.set_workspace_respondent_branding_active(uuid, boolean) to authenticated;
