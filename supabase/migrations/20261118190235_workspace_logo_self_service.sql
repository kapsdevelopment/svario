-- Tenant self-service is scoped to an existing B-profile and only replaces its
-- logo. Provisioning, name, color and activation remain Svario-admin actions.
create function app_private.can_manage_workspace_branding(p_auth_user_id uuid, p_workspace_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.account_auth_users au
    join public.accounts a on a.id = au.account_id and a.status = 'active'
    join public.workspace_members m on m.account_id = a.id
      and m.status = 'active' and m.role in ('owner', 'admin')
    join public.workspaces w on w.id = m.workspace_id and w.status = 'active'
    where au.auth_user_id = p_auth_user_id and w.id = p_workspace_id
  );
$$;

create function app_private.get_my_workspace_branding(p_workspace_id uuid)
returns table (display_name text, accent_color text, logo_png_base64 text, is_active boolean, revision bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not app_private.can_manage_workspace_branding(auth.uid(), p_workspace_id) then
    raise exception 'Workspace owner or admin access is required.' using errcode = '42501';
  end if;
  return query
  select b.display_name, b.accent_color, replace(encode(b.logo_png, 'base64'), chr(10), ''), b.is_active, b.revision
  from app_private.workspace_respondent_branding b where b.workspace_id = p_workspace_id;
end;
$$;

create function public.get_my_workspace_branding(p_workspace_id uuid)
returns table (display_name text, accent_color text, logo_png_base64 text, is_active boolean, revision bigint)
language sql stable security invoker
set search_path = ''
as $$ select * from app_private.get_my_workspace_branding(p_workspace_id); $$;

-- Only the Edge Function may supply a verified auth identity and decoded PNG.
create function app_private.replace_workspace_branding_logo(
  p_auth_user_id uuid, p_workspace_id uuid, p_expected_revision bigint, p_logo_png_base64 text
)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_logo bytea;
begin
  if not app_private.can_manage_workspace_branding(p_auth_user_id, p_workspace_id) then
    raise exception 'Workspace owner or admin access is required.' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 1
    or p_logo_png_base64 is null or length(p_logo_png_base64) > 349528 then
    raise exception 'Invalid logo update.' using errcode = '22023';
  end if;
  v_logo := decode(p_logo_png_base64, 'base64');
  if octet_length(v_logo) not between 33 and 262144
    or substring(v_logo for 8) <> decode('89504e470d0a1a0a', 'hex') then
    raise exception 'Invalid PNG logo.' using errcode = '22023';
  end if;

  select revision into v_revision from app_private.workspace_respondent_branding
  where workspace_id = p_workspace_id for update;
  if not found then
    raise exception 'Workspace branding profile not found.' using errcode = 'P0002';
  end if;
  if v_revision <> p_expected_revision then
    raise exception 'Branding profile has changed. Reload before saving.' using errcode = 'P0001';
  end if;
  update app_private.workspace_respondent_branding
  set logo_png = v_logo, revision = v_revision + 1
  where workspace_id = p_workspace_id;
  return v_revision + 1;
end;
$$;

create function public.replace_workspace_branding_logo(
  p_auth_user_id uuid, p_workspace_id uuid, p_expected_revision bigint, p_logo_png_base64 text
)
returns bigint
language sql security invoker
set search_path = ''
as $$ select app_private.replace_workspace_branding_logo(
  p_auth_user_id, p_workspace_id, p_expected_revision, p_logo_png_base64
); $$;

revoke all on function app_private.can_manage_workspace_branding(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.get_my_workspace_branding(uuid), public.get_my_workspace_branding(uuid)
  from public, anon, authenticated, service_role;
grant execute on function app_private.get_my_workspace_branding(uuid), public.get_my_workspace_branding(uuid)
  to authenticated;
revoke all on function app_private.replace_workspace_branding_logo(uuid, uuid, bigint, text),
  public.replace_workspace_branding_logo(uuid, uuid, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function app_private.replace_workspace_branding_logo(uuid, uuid, bigint, text),
  public.replace_workspace_branding_logo(uuid, uuid, bigint, text)
  to service_role;
