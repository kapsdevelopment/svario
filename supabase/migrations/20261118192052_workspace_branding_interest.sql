-- Permission to use branding is independent of uploaded content and publication.
create table app_private.workspace_branding_access (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  granted_by_account_id uuid references public.accounts(id) on delete set null,
  granted_at timestamptz not null default now()
);
create index workspace_branding_access_granted_by_idx
  on app_private.workspace_branding_access(granted_by_account_id);

create table app_private.workspace_branding_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  requested_by_account_id uuid references public.accounts(id) on delete set null,
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 120),
  contact_email text not null check (char_length(contact_email) between 3 and 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'in_review', 'approved', 'closed')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  handled_by_account_id uuid references public.accounts(id) on delete set null,
  revision bigint not null default 1
);
create index workspace_branding_requests_inbox_idx
  on app_private.workspace_branding_requests(status, requested_at desc, id);
create index workspace_branding_requests_requested_by_idx
  on app_private.workspace_branding_requests(requested_by_account_id);
create index workspace_branding_requests_handled_by_idx
  on app_private.workspace_branding_requests(handled_by_account_id);

alter table app_private.workspace_branding_access enable row level security;
alter table app_private.workspace_branding_requests enable row level security;
revoke all on app_private.workspace_branding_access, app_private.workspace_branding_requests
  from public, anon, authenticated, service_role;

-- Preserve all existing local profiles and the central admin's provisioning flow.
insert into app_private.workspace_branding_access(workspace_id)
select workspace_id from app_private.workspace_respondent_branding;

create function app_private.grant_access_for_branding_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into app_private.workspace_branding_access(workspace_id) values (new.workspace_id)
  on conflict (workspace_id) do nothing;
  update app_private.workspace_branding_requests
  set status = 'approved', revision = revision + 1, updated_at = now()
  where workspace_id = new.workspace_id and status <> 'approved';
  return new;
end;
$$;
revoke all on function app_private.grant_access_for_branding_profile() from public, anon, authenticated, service_role;
create trigger grant_access_for_branding_profile after insert on app_private.workspace_respondent_branding
for each row execute function app_private.grant_access_for_branding_profile();

create function app_private.get_my_branding_access(p_workspace_id uuid)
returns table (is_allowed boolean, request_status text, requested_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.can_manage_workspace_branding(auth.uid(), p_workspace_id) then
    raise exception 'Workspace owner or admin access is required.' using errcode = '42501';
  end if;
  return query select
    exists(select 1 from app_private.workspace_branding_access a where a.workspace_id = p_workspace_id),
    r.status, r.requested_at
  from (select p_workspace_id as id) w
  left join app_private.workspace_branding_requests r on r.workspace_id = w.id;
end;
$$;

create function public.get_my_branding_access(p_workspace_id uuid)
returns table (is_allowed boolean, request_status text, requested_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from app_private.get_my_branding_access(p_workspace_id);
$$;

create function app_private.request_workspace_branding(
  p_workspace_id uuid, p_contact_name text, p_contact_email text, p_message text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_request app_private.workspace_branding_requests%rowtype;
begin
  if not app_private.can_manage_workspace_branding(auth.uid(), p_workspace_id) then
    raise exception 'Workspace owner or admin access is required.' using errcode = '42501';
  end if;
  if p_contact_name is null or char_length(btrim(p_contact_name)) not between 1 and 120
    or p_contact_email is null or char_length(btrim(p_contact_email)) not between 3 and 254
    or btrim(p_contact_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(coalesce(p_message, '')) > 2000 then
    raise exception 'Invalid contact details.' using errcode = '22023';
  end if;
  -- All request/grant/first-upload operations lock the workspace first.
  perform 1 from public.workspaces where id = p_workspace_id and status = 'active' for update;
  if not found then raise exception 'Workspace not found.' using errcode = '42501'; end if;
  if exists(select 1 from app_private.workspace_branding_access where workspace_id = p_workspace_id) then
    raise exception 'Branding is already allowed.' using errcode = '22023';
  end if;
  select * into v_request from app_private.workspace_branding_requests where workspace_id = p_workspace_id for update;
  -- Retries and simultaneous requests from different admins are idempotent.
  if found and v_request.status <> 'closed' then return v_request.id; end if;
  insert into app_private.workspace_branding_requests as r
    (workspace_id, requested_by_account_id, contact_name, contact_email, message)
  values (p_workspace_id, app_private.current_account_id(), btrim(p_contact_name), btrim(p_contact_email), btrim(coalesce(p_message, '')))
  on conflict (workspace_id) do update set
    requested_by_account_id = excluded.requested_by_account_id,
    contact_name = excluded.contact_name, contact_email = excluded.contact_email, message = excluded.message,
    status = 'new', requested_at = now(), updated_at = now(), handled_by_account_id = null, revision = r.revision + 1
  returning * into v_request;
  return v_request.id;
end;
$$;

create function public.request_workspace_branding(p_workspace_id uuid, p_contact_name text, p_contact_email text, p_message text)
returns uuid language sql security invoker set search_path = '' as $$
  select app_private.request_workspace_branding(p_workspace_id, p_contact_name, p_contact_email, p_message);
$$;

create function app_private.count_new_branding_requests()
returns integer language plpgsql stable security definer set search_path = '' as $$
begin
  perform app_private.require_svario_admin();
  return (select count(*)::integer from app_private.workspace_branding_requests r
    join public.workspaces w on w.id = r.workspace_id and w.status = 'active' where r.status = 'new');
end;
$$;
create function public.count_new_branding_requests()
returns integer language sql stable security invoker set search_path = '' as $$
  select app_private.count_new_branding_requests();
$$;

create function app_private.list_workspace_branding_requests(p_status text, p_offset integer)
returns table (id uuid, workspace_id uuid, workspace_name text, organization_number text,
  contact_name text, contact_email text, message text, status text, requested_at timestamptz, revision bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app_private.require_svario_admin();
  if p_offset is null or p_offset < 0 or (p_status is not null and p_status not in ('new', 'in_review', 'approved', 'closed')) then
    raise exception 'Invalid inbox filter.' using errcode = '22023';
  end if;
  return query select r.id, r.workspace_id, w.name, w.organization_number,
    r.contact_name, r.contact_email, r.message, r.status, r.requested_at, r.revision
  from app_private.workspace_branding_requests r
  join public.workspaces w on w.id = r.workspace_id and w.status = 'active'
  where p_status is null or r.status = p_status
  order by r.requested_at desc, r.id limit 51 offset p_offset;
end;
$$;
create function public.list_workspace_branding_requests(p_status text default null, p_offset integer default 0)
returns table (id uuid, workspace_id uuid, workspace_name text, organization_number text,
  contact_name text, contact_email text, message text, status text, requested_at timestamptz, revision bigint)
language sql stable security invoker set search_path = '' as $$
  select * from app_private.list_workspace_branding_requests(p_status, p_offset);
$$;

-- Approval and permission are committed together. An ordinary status edit cannot
-- grant access, and stale admin tabs cannot undo another admin's decision.
create function app_private.review_workspace_branding_request(p_request_id uuid, p_expected_revision bigint, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_workspace_id uuid; v_request app_private.workspace_branding_requests%rowtype;
begin
  perform app_private.require_svario_admin();
  if p_status is null or p_status not in ('in_review', 'approved', 'closed') or p_expected_revision is null then
    raise exception 'Invalid request status.' using errcode = '22023';
  end if;
  select workspace_id into v_workspace_id from app_private.workspace_branding_requests where id = p_request_id;
  perform 1 from public.workspaces where id = v_workspace_id and status = 'active' for update;
  if not found then raise exception 'Request not found.' using errcode = 'P0002'; end if;
  select * into v_request from app_private.workspace_branding_requests where id = p_request_id for update;
  if v_request.revision <> p_expected_revision then
    raise exception 'Request has changed. Refresh the inbox.' using errcode = 'P0001';
  end if;
  if v_request.status = 'approved' or (v_request.status = 'closed' and p_status <> 'in_review') then
    raise exception 'Request cannot change to this status.' using errcode = '22023';
  end if;
  if p_status = 'approved' then
    insert into app_private.workspace_branding_access(workspace_id, granted_by_account_id)
    values (v_workspace_id, app_private.current_account_id()) on conflict (workspace_id) do nothing;
  end if;
  update app_private.workspace_branding_requests set
    status = p_status, updated_at = now(), handled_by_account_id = app_private.current_account_id(), revision = revision + 1
  where id = p_request_id;
end;
$$;
create function public.review_workspace_branding_request(p_request_id uuid, p_expected_revision bigint, p_status text)
returns void language sql security invoker set search_path = '' as $$
  select app_private.review_workspace_branding_request(p_request_id, p_expected_revision, p_status);
$$;

create or replace function app_private.replace_workspace_branding_logo(
  p_auth_user_id uuid, p_workspace_id uuid, p_expected_revision bigint, p_logo_png_base64 text
)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_existing app_private.workspace_respondent_branding%rowtype; v_logo bytea; v_name text;
begin
  if not app_private.can_manage_workspace_branding(p_auth_user_id, p_workspace_id)
    or not exists(select 1 from app_private.workspace_branding_access where workspace_id = p_workspace_id) then
    raise exception 'Branding permission and workspace admin access are required.' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_logo_png_base64 is null or length(p_logo_png_base64) > 349528 then
    raise exception 'Invalid logo update.' using errcode = '22023';
  end if;
  v_logo := decode(p_logo_png_base64, 'base64');
  if octet_length(v_logo) not between 33 and 262144 or substring(v_logo for 8) <> decode('89504e470d0a1a0a', 'hex') then
    raise exception 'Invalid PNG logo.' using errcode = '22023';
  end if;
  select left(btrim(name), 80) into v_name from public.workspaces where id = p_workspace_id and status = 'active' for update;
  if not found then raise exception 'Workspace not found.' using errcode = '42501'; end if;
  select * into v_existing from app_private.workspace_respondent_branding where workspace_id = p_workspace_id for update;
  if coalesce(v_existing.revision, 0) <> p_expected_revision then
    raise exception 'Branding profile has changed. Reload before saving.' using errcode = 'P0001';
  end if;
  insert into app_private.workspace_respondent_branding(workspace_id, display_name, accent_color, logo_png, is_active, revision)
  values (p_workspace_id, v_name, '#345b4b', v_logo, true, 1)
  on conflict (workspace_id) do update set logo_png = excluded.logo_png, revision = v_existing.revision + 1;
  return coalesce(v_existing.revision, 0) + 1;
end;
$$;

revoke all on function app_private.get_my_branding_access(uuid), public.get_my_branding_access(uuid),
  app_private.request_workspace_branding(uuid, text, text, text), public.request_workspace_branding(uuid, text, text, text),
  app_private.count_new_branding_requests(), public.count_new_branding_requests(),
  app_private.list_workspace_branding_requests(text, integer), public.list_workspace_branding_requests(text, integer),
  app_private.review_workspace_branding_request(uuid, bigint, text), public.review_workspace_branding_request(uuid, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function app_private.get_my_branding_access(uuid), public.get_my_branding_access(uuid),
  app_private.request_workspace_branding(uuid, text, text, text), public.request_workspace_branding(uuid, text, text, text),
  app_private.count_new_branding_requests(), public.count_new_branding_requests(),
  app_private.list_workspace_branding_requests(text, integer), public.list_workspace_branding_requests(text, integer),
  app_private.review_workspace_branding_request(uuid, bigint, text), public.review_workspace_branding_request(uuid, bigint, text)
  to authenticated;
