alter table app_private.workspace_respondent_branding
  add column revision bigint not null default 1,
  drop constraint workspace_respondent_branding_logo_png_check,
  add constraint workspace_respondent_branding_logo_png_check check (
    octet_length(logo_png) between 33 and 262144
    and substring(logo_png for 8) = decode('89504e470d0a1a0a', 'hex')
  );

revoke all on app_private.workspace_respondent_branding from service_role;

create function app_private.get_workspace_branding_editor(p_workspace_id uuid)
returns table (display_name text, accent_color text, logo_png_base64 text, is_active boolean, revision bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform app_private.require_svario_admin();
  return query
  select btrim(b.display_name), b.accent_color, replace(encode(b.logo_png, 'base64'), chr(10), ''), b.is_active, b.revision
  from app_private.workspace_respondent_branding b
  join public.workspaces w on w.id = b.workspace_id and w.status = 'active'
  where b.workspace_id = p_workspace_id;
end;
$$;

create function public.get_workspace_branding_editor(p_workspace_id uuid)
returns table (display_name text, accent_color text, logo_png_base64 text, is_active boolean, revision bigint)
language sql stable security invoker
set search_path = ''
as $$ select * from app_private.get_workspace_branding_editor(p_workspace_id); $$;

-- Only the image-validating Edge Function can write profile content. Recheck the
-- authenticated domain account in the same transaction as the write.
create function app_private.save_workspace_respondent_branding(
  p_auth_user_id uuid, p_workspace_id uuid, p_display_name text, p_accent_color text,
  p_expected_revision bigint, p_logo_png_base64 text
)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v_existing app_private.workspace_respondent_branding%rowtype;
  v_logo bytea;
  v_revision bigint;
begin
  if not exists (
    select 1 from app_private.svario_admins a
    join public.accounts ac on ac.id = a.account_id and ac.status = 'active'
    join public.account_auth_users au on au.account_id = a.account_id
    where au.auth_user_id = p_auth_user_id
  ) then
    raise exception 'Svario admin access is required.' using errcode = '42501';
  end if;

  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80
    or p_accent_color is null or p_accent_color !~ '^#[0-9a-fA-F]{6}$'
    or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid branding profile.' using errcode = '22023';
  end if;

  perform 1 from public.workspaces where id = p_workspace_id and status = 'active' for update;
  if not found then
    raise exception 'Workspace not found.' using errcode = 'P0002';
  end if;

  select * into v_existing from app_private.workspace_respondent_branding
  where workspace_id = p_workspace_id for update;
  if coalesce(v_existing.revision, 0) <> p_expected_revision then
    raise exception 'Branding profile has changed. Reload before saving.' using errcode = 'P0001';
  end if;

  if p_logo_png_base64 is not null then
    if length(p_logo_png_base64) > 349528 then
      raise exception 'Logo is too large.' using errcode = '22023';
    end if;
    v_logo := decode(p_logo_png_base64, 'base64');
  else
    v_logo := v_existing.logo_png;
  end if;

  if v_logo is null then
    raise exception 'Logo is required.' using errcode = '22023';
  end if;

  insert into app_private.workspace_respondent_branding as b
    (workspace_id, display_name, accent_color, logo_png, is_active, revision)
  values (p_workspace_id, btrim(p_display_name), lower(p_accent_color), v_logo,
    coalesce(v_existing.is_active, false), p_expected_revision + 1)
  on conflict (workspace_id) do update set
    display_name = excluded.display_name, accent_color = excluded.accent_color,
    logo_png = excluded.logo_png, revision = excluded.revision
  returning b.revision into v_revision;
  return v_revision;
end;
$$;

create function public.save_workspace_respondent_branding(
  p_auth_user_id uuid, p_workspace_id uuid, p_display_name text, p_accent_color text,
  p_expected_revision bigint, p_logo_png_base64 text
)
returns bigint
language sql security invoker
set search_path = ''
as $$ select app_private.save_workspace_respondent_branding(
  p_auth_user_id, p_workspace_id, p_display_name, p_accent_color, p_expected_revision, p_logo_png_base64
); $$;

create or replace function app_private.set_workspace_respondent_branding_active(p_workspace_id uuid, p_is_active boolean)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_is_active boolean;
begin
  perform app_private.require_svario_admin();
  update app_private.workspace_respondent_branding b
  set is_active = p_is_active, revision = b.revision + 1
  from public.workspaces w
  where b.workspace_id = p_workspace_id and w.id = b.workspace_id and w.status = 'active'
  returning b.is_active into v_is_active;
  if not found then
    raise exception 'Workspace branding profile not found.' using errcode = 'P0002';
  end if;
  return v_is_active;
end;
$$;

revoke all on function app_private.get_workspace_branding_editor(uuid), public.get_workspace_branding_editor(uuid)
  from public, anon, authenticated, service_role;
grant execute on function app_private.get_workspace_branding_editor(uuid), public.get_workspace_branding_editor(uuid)
  to authenticated;
revoke all on function app_private.save_workspace_respondent_branding(uuid, uuid, text, text, bigint, text),
  public.save_workspace_respondent_branding(uuid, uuid, text, text, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function app_private.save_workspace_respondent_branding(uuid, uuid, text, text, bigint, text),
  public.save_workspace_respondent_branding(uuid, uuid, text, text, bigint, text)
  to service_role;
