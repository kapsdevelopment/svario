-- Opt-in C-instance administration. No survey/response grants are changed.
-- Domain account IDs, never editable auth metadata, carry the admin role.
create table app_private.instance_admins (
  account_id uuid primary key references public.app_users(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create table app_private.instance_registration_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  mode text not null default 'closed' check (mode in ('closed', 'open', 'domains')),
  allowed_domains text[] not null default '{}',
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into app_private.instance_registration_policy(singleton) values (true);
create table app_private.instance_policy_audit (
  id bigint generated always as identity primary key,
  actor_account_id uuid references public.app_users(user_id) on delete set null,
  changed_at timestamptz not null default now(),
  old_policy jsonb not null,
  new_policy jsonb not null
);
alter table app_private.instance_admins enable row level security;
alter table app_private.instance_registration_policy enable row level security;
alter table app_private.instance_policy_audit enable row level security;
revoke all on app_private.instance_admins, app_private.instance_registration_policy,
  app_private.instance_policy_audit from public, anon, authenticated, service_role;

create function app_private.instance_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app_private.instance_admins ia
    join public.account_auth_users aau on aau.account_id = ia.account_id
    join public.accounts a on a.id = ia.account_id
    join auth.users u on u.id = aau.auth_user_id
    where aau.auth_user_id = (select auth.uid()) and a.status = 'active'
      and u.email_confirmed_at is not null
      and exists (select 1 from app_private.instance_registration_policy where enabled)
  );
$$;
create function app_private.instance_signup_policy() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('enabled', enabled, 'mode', mode,
    'allowedDomains', allowed_domains, 'version', version)
  from app_private.instance_registration_policy where singleton;
$$;

create function app_private.instance_list_users(p_offset integer, p_limit integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not app_private.instance_is_admin() then
    raise exception 'Instance administrator required' using errcode = '42501';
  end if;
  if p_offset is null or p_limit is null or p_offset < 0 or p_offset > 100000
    or p_limit < 1 or p_limit > 100 then raise exception 'Invalid pagination'; end if;
  select jsonb_build_object('total', (select count(*) from auth.users), 'users',
    coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb)) into result
  from (
    select u.id as "authUserId", u.email, u.created_at as "createdAt",
      u.email_confirmed_at as "confirmedAt", u.last_sign_in_at as "lastSignInAt",
      aau.account_id as "accountId", a.status as "accountStatus",
      (ia.account_id is not null) as "isAdmin"
    from auth.users u
    left join public.account_auth_users aau on aau.auth_user_id = u.id
    left join public.accounts a on a.id = aau.account_id
    left join app_private.instance_admins ia on ia.account_id = aau.account_id
    order by u.created_at desc, u.id limit p_limit offset p_offset
  ) rows;
  return result;
end;
$$;

create function app_private.instance_update_signup_policy(
  p_mode text, p_domains text[], p_expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare old_policy jsonb; new_policy jsonb; domains text[]; current_version bigint;
begin
  if not app_private.instance_is_admin() then
    raise exception 'Instance administrator required' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('closed', 'open', 'domains') or p_domains is null
    or cardinality(p_domains) > 50 then raise exception 'Invalid registration policy'; end if;
  select coalesce(array_agg(distinct lower(btrim(d)) order by lower(btrim(d))), '{}')
    into domains from unnest(p_domains) d;
  if exists (select 1 from unnest(domains) d where d is null or length(d) > 253
    or d !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
    or (p_mode = 'domains' and cardinality(domains) = 0)
    or (p_mode <> 'domains' and cardinality(domains) <> 0)
    then raise exception 'Use exact email domains, without @ or wildcards'; end if;
  select version into current_version from app_private.instance_registration_policy
    where singleton for update;
  if p_expected_version is null or current_version <> p_expected_version then
    raise exception 'Policy changed; reload before saving' using errcode = '40001';
  end if;
  old_policy := app_private.instance_signup_policy();
  update app_private.instance_registration_policy set mode = p_mode, allowed_domains = domains,
    version = version + 1, updated_at = now() where singleton;
  new_policy := app_private.instance_signup_policy();
  insert into app_private.instance_policy_audit(actor_account_id, old_policy, new_policy)
    values (app_private.current_account_id(), old_policy, new_policy);
  return new_policy;
end;
$$;

-- Invoker hook: Auth can read only this policy, not the admin/audit tables.
grant usage on schema app_private to supabase_auth_admin;
grant select on app_private.instance_registration_policy to supabase_auth_admin;
create policy auth_reads_instance_signup_policy on app_private.instance_registration_policy
  for select to supabase_auth_admin using (true);
create function app_private.before_user_created(event jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare policy app_private.instance_registration_policy; email text;
begin
  select * into strict policy from app_private.instance_registration_policy where singleton;
  if not policy.enabled then return '{}'::jsonb; end if;
  email := lower(event->'user'->>'email');
  if policy.mode = 'open' and email is not null and email <> '' then return '{}'::jsonb; end if;
  if policy.mode = 'domains' and email is not null
    and email ~ '^[^@]+@[^@]+$' and split_part(email, '@', 2) = any(policy.allowed_domains)
    then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'Registration is not permitted by the instance policy.'));
end;
$$;
revoke all on function app_private.before_user_created(jsonb) from public, anon, authenticated, service_role;
grant execute on function app_private.before_user_created(jsonb) to supabase_auth_admin;

-- PostgREST exposes only public; wrappers do not bypass the checked private functions.
create function public.instance_is_admin() returns boolean language sql stable security invoker
  set search_path = '' as $$ select app_private.instance_is_admin(); $$;
create function public.instance_signup_policy() returns jsonb language sql stable security invoker
  set search_path = '' as $$ select app_private.instance_signup_policy(); $$;
create function public.instance_list_users(p_offset integer default 0, p_limit integer default 50)
  returns jsonb language sql stable security invoker set search_path = ''
  as $$ select app_private.instance_list_users(p_offset, p_limit); $$;
create function public.instance_update_signup_policy(p_mode text, p_domains text[], p_expected_version bigint)
  returns jsonb language sql security invoker set search_path = ''
  as $$ select app_private.instance_update_signup_policy(p_mode, p_domains, p_expected_version); $$;

revoke all on function app_private.instance_is_admin(), public.instance_is_admin(),
  app_private.instance_signup_policy(), public.instance_signup_policy(),
  app_private.instance_list_users(integer, integer), public.instance_list_users(integer, integer),
  app_private.instance_update_signup_policy(text, text[], bigint),
  public.instance_update_signup_policy(text, text[], bigint) from public, anon, authenticated, service_role;
grant usage on schema app_private to anon, authenticated;
grant execute on function app_private.instance_signup_policy(), public.instance_signup_policy() to anon, authenticated;
grant execute on function app_private.instance_is_admin(), public.instance_is_admin(),
  app_private.instance_list_users(integer, integer), public.instance_list_users(integer, integer),
  app_private.instance_update_signup_policy(text, text[], bigint),
  public.instance_update_signup_policy(text, text[], bigint) to authenticated;
