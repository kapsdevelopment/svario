-- Identity foundation for Svario.
--
-- Supabase Auth users are login identities. Svario domain ownership lives in
-- app_users.user_id and every business table should reference that id.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;

revoke all on schema app_private from public;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'account_status'
  ) then
    create type public.account_status as enum (
      'active',
      'blocked',
      'pending_delete',
      'deleted'
    );
  end if;
end
$$;

create table if not exists public.app_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.account_auth_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  account_id uuid not null references public.app_users(user_id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists account_auth_users_account_id_idx
  on public.account_auth_users using btree (account_id);

create table if not exists public.accounts (
  id uuid primary key references public.app_users(user_id) on delete cascade,
  status public.account_status not null default 'active',
  blocked_reason text,
  pending_delete_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references public.app_users(user_id) on delete cascade,
  display_name text,
  contact_email text,
  support_label text,
  first_seen_auth_provider text,
  profile_name_set_at timestamptz,
  profile_completed_at timestamptz,
  timezone text not null default 'Europe/Oslo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_identities (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.app_users(user_id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  subject text not null,
  email text,
  email_is_private boolean not null default false,
  provider_display_name text,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  raw_user_meta jsonb,
  raw_app_meta jsonb,
  created_at timestamptz not null default now(),
  constraint user_identities_provider_subject_key unique (provider, subject)
);

create index if not exists user_identities_user_id_idx
  on public.user_identities using btree (user_id);

create index if not exists user_identities_auth_user_id_idx
  on public.user_identities using btree (auth_user_id);

create index if not exists user_identities_provider_idx
  on public.user_identities using btree (provider);

create table if not exists public.user_settings (
  user_id uuid primary key references public.app_users(user_id) on delete cascade,
  locale text not null default 'nb-NO',
  timezone text not null default 'Europe/Oslo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public, app_private
as $$
  select aau.account_id
  from public.account_auth_users aau
  where aau.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.ensure_account_initialized_v2()
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_account_id uuid;
begin
  if v_auth_uid is null then
    raise exception 'Not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_auth_uid::text, 0));

  select aau.account_id
    into v_account_id
  from public.account_auth_users aau
  where aau.auth_user_id = v_auth_uid
  limit 1;

  if v_account_id is null then
    v_account_id := extensions.gen_random_uuid();

    insert into public.app_users(user_id)
    values (v_account_id)
    on conflict (user_id) do nothing;

    insert into public.account_auth_users(auth_user_id, account_id)
    values (v_auth_uid, v_account_id)
    on conflict (auth_user_id) do nothing;

    select aau.account_id
      into v_account_id
    from public.account_auth_users aau
    where aau.auth_user_id = v_auth_uid
    limit 1;

    if v_account_id is null then
      raise exception 'Failed to create account mapping for authenticated user';
    end if;
  end if;

  insert into public.app_users(user_id)
  values (v_account_id)
  on conflict (user_id) do nothing;

  insert into public.accounts(id)
  values (v_account_id)
  on conflict (id) do nothing;

  insert into public.profiles(id)
  values (v_account_id)
  on conflict (id) do nothing;

  insert into public.user_settings(user_id)
  values (v_account_id)
  on conflict (user_id) do nothing;

  return v_account_id;
end;
$$;

create or replace function app_private.sync_my_identity(
  p_provider text,
  p_subject text,
  p_email text default null,
  p_provider_display_name text default null,
  p_email_is_private boolean default false,
  p_raw_user_meta jsonb default null,
  p_raw_app_meta jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_account_id uuid;
  v_existing_account_id uuid;
  v_provider text := nullif(btrim(p_provider), '');
  v_subject text := nullif(btrim(p_subject), '');
  v_row_count integer;
begin
  if v_auth_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_provider is null then
    raise exception 'Provider cannot be empty';
  end if;

  if v_subject is null then
    raise exception 'Subject cannot be empty';
  end if;

  v_account_id := app_private.current_account_id();

  if v_account_id is null then
    v_account_id := app_private.ensure_account_initialized_v2();
  end if;

  select ui.user_id
    into v_existing_account_id
  from public.user_identities ui
  where ui.provider = v_provider
    and ui.subject = v_subject
  limit 1;

  if v_existing_account_id is not null
     and v_existing_account_id <> v_account_id then
    raise exception
      'Identity %:% is already linked to another account',
      v_provider,
      v_subject
      using errcode = '23505';
  end if;

  insert into public.user_identities (
    user_id,
    auth_user_id,
    provider,
    subject,
    email,
    email_is_private,
    provider_display_name,
    linked_at,
    last_seen_at,
    raw_user_meta,
    raw_app_meta
  )
  values (
    v_account_id,
    v_auth_uid,
    v_provider,
    v_subject,
    p_email,
    coalesce(p_email_is_private, false),
    p_provider_display_name,
    now(),
    now(),
    p_raw_user_meta,
    p_raw_app_meta
  )
  on conflict (provider, subject) do update
    set
      auth_user_id = excluded.auth_user_id,
      email = coalesce(excluded.email, public.user_identities.email),
      email_is_private = excluded.email_is_private,
      provider_display_name = coalesce(
        excluded.provider_display_name,
        public.user_identities.provider_display_name
      ),
      last_seen_at = now(),
      raw_user_meta = coalesce(
        excluded.raw_user_meta,
        public.user_identities.raw_user_meta
      ),
      raw_app_meta = coalesce(
        excluded.raw_app_meta,
        public.user_identities.raw_app_meta
      )
    where public.user_identities.user_id = excluded.user_id;

  get diagnostics v_row_count = row_count;

  if v_row_count = 0 then
    raise exception
      'Identity %:% could not be synced because it belongs to another account',
      v_provider,
      v_subject
      using errcode = '23505';
  end if;

  update public.profiles
     set
       contact_email = case
         when contact_email is null and p_email is not null then p_email
         else contact_email
       end,
       first_seen_auth_provider = coalesce(first_seen_auth_provider, v_provider),
       support_label = case
         when support_label is not null then support_label
         when p_provider_display_name is not null then p_provider_display_name
         when p_email is not null then p_email
         else 'user-' || left(v_account_id::text, 8)
       end,
       updated_at = now()
   where id = v_account_id;

  return v_account_id;
end;
$$;

create or replace function public.ensure_account_initialized_v2()
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.ensure_account_initialized_v2();
$$;

create or replace function public.ensure_user()
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select public.ensure_account_initialized_v2();
$$;

create or replace function public.ensure_domain_account()
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select public.ensure_account_initialized_v2();
$$;

create or replace function public.sync_my_identity(
  p_provider text,
  p_subject text,
  p_email text default null,
  p_provider_display_name text default null,
  p_email_is_private boolean default false,
  p_raw_user_meta jsonb default null,
  p_raw_app_meta jsonb default null
)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.sync_my_identity(
    p_provider,
    p_subject,
    p_email,
    p_provider_display_name,
    p_email_is_private,
    p_raw_user_meta,
    p_raw_app_meta
  );
$$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row
execute function app_private.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function app_private.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function app_private.set_updated_at();

alter table public.app_users enable row level security;
alter table public.account_auth_users enable row level security;
alter table public.accounts enable row level security;
alter table public.profiles enable row level security;
alter table public.user_identities enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "account_auth_users read own auth mapping" on public.account_auth_users;
create policy "account_auth_users read own auth mapping"
  on public.account_auth_users
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists "app_users read own domain user" on public.app_users;
create policy "app_users read own domain user"
  on public.app_users
  for select
  to authenticated
  using (app_private.current_account_id() = user_id);

drop policy if exists "accounts read own account" on public.accounts;
create policy "accounts read own account"
  on public.accounts
  for select
  to authenticated
  using (app_private.current_account_id() = id);

drop policy if exists "profiles read own profile" on public.profiles;
create policy "profiles read own profile"
  on public.profiles
  for select
  to authenticated
  using (app_private.current_account_id() = id);

drop policy if exists "profiles update own profile" on public.profiles;
create policy "profiles update own profile"
  on public.profiles
  for update
  to authenticated
  using (app_private.current_account_id() = id)
  with check (app_private.current_account_id() = id);

drop policy if exists "user_identities read own identities" on public.user_identities;
create policy "user_identities read own identities"
  on public.user_identities
  for select
  to authenticated
  using (app_private.current_account_id() = user_id);

drop policy if exists "user_settings read own settings" on public.user_settings;
create policy "user_settings read own settings"
  on public.user_settings
  for select
  to authenticated
  using (app_private.current_account_id() = user_id);

drop policy if exists "user_settings update own settings" on public.user_settings;
create policy "user_settings update own settings"
  on public.user_settings
  for update
  to authenticated
  using (app_private.current_account_id() = user_id)
  with check (app_private.current_account_id() = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on table
  public.app_users,
  public.account_auth_users,
  public.accounts,
  public.profiles,
  public.user_identities,
  public.user_settings
to authenticated;

grant update (display_name, contact_email, timezone)
  on public.profiles
  to authenticated;

grant update (locale, timezone)
  on public.user_settings
  to authenticated;

revoke all on function app_private.set_updated_at() from public;
revoke all on function app_private.current_account_id() from public;
revoke all on function app_private.ensure_account_initialized_v2() from public;
revoke all on function app_private.sync_my_identity(
  text,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb
) from public;

revoke all on function public.ensure_account_initialized_v2() from public;
revoke all on function public.ensure_user() from public;
revoke all on function public.ensure_domain_account() from public;
revoke all on function public.sync_my_identity(
  text,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb
) from public;

grant usage on schema app_private to authenticated, service_role;
grant execute on function app_private.current_account_id() to authenticated, service_role;
grant execute on function app_private.ensure_account_initialized_v2() to authenticated, service_role;
grant execute on function app_private.sync_my_identity(
  text,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb
) to authenticated, service_role;

grant execute on function public.ensure_account_initialized_v2() to authenticated, service_role;
grant execute on function public.ensure_user() to authenticated, service_role;
grant execute on function public.ensure_domain_account() to authenticated, service_role;
grant execute on function public.sync_my_identity(
  text,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb
) to authenticated, service_role;
