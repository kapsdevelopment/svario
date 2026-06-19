do $$
begin
  create type public.workspace_type as enum ('business', 'team');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workspace_status as enum ('active', 'deleted');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workspace_member_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workspace_member_status as enum ('active', 'removed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.survey_visibility as enum ('private', 'workspace');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  type public.workspace_type not null,
  name text not null,
  slug text not null unique,
  organization_number text unique,
  status public.workspace_status not null default 'active',
  verified_at timestamptz,
  created_by_account_id uuid references public.app_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_not_empty check (length(btrim(name)) > 0),
  constraint workspaces_slug_format check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  constraint workspaces_business_requires_org_number check (
    (
      type = 'business'
      and organization_number is not null
      and organization_number ~ '^[0-9]{9}$'
    )
    or (
      type = 'team'
      and organization_number is null
    )
  )
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.app_users(user_id) on delete cascade,
  role public.workspace_member_role not null default 'member',
  status public.workspace_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, account_id),
  constraint workspace_members_removed_at_matches_status check (
    (status = 'removed' and removed_at is not null)
    or (status = 'active' and removed_at is null)
  )
);

create table if not exists public.workspace_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  role public.workspace_member_role not null default 'member',
  invited_by_account_id uuid references public.app_users(user_id) on delete set null,
  accepted_by_account_id uuid references public.app_users(user_id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workspace_invitations_role_not_owner check (role <> 'owner')
);

create index if not exists workspace_members_account_id_idx
  on public.workspace_members(account_id);
create index if not exists workspace_members_workspace_active_idx
  on public.workspace_members(workspace_id, status);
create index if not exists workspace_invitations_workspace_id_idx
  on public.workspace_invitations(workspace_id);
create index if not exists workspace_invitations_active_lookup_idx
  on public.workspace_invitations(token_hash, expires_at)
  where accepted_at is null and revoked_at is null;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function app_private.set_updated_at();

drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at
  before update on public.workspace_members
  for each row execute function app_private.set_updated_at();

alter table public.surveys
  add column if not exists workspace_id uuid references public.workspaces(id) on delete restrict,
  add column if not exists visibility public.survey_visibility not null default 'private';

alter table public.surveys
  drop constraint if exists surveys_visibility_workspace_requires_workspace,
  add constraint surveys_visibility_workspace_requires_workspace check (
    visibility = 'private'
    or workspace_id is not null
  );

drop index if exists surveys_owner_account_id_idx;
create index if not exists surveys_owner_account_id_idx
  on public.surveys(owner_account_id);
create index if not exists surveys_workspace_id_idx
  on public.surveys(workspace_id);
create index if not exists surveys_workspace_visibility_idx
  on public.surveys(workspace_id, visibility);

alter table public.surveys
  drop constraint if exists surveys_owner_account_id_fkey,
  alter column owner_account_id drop not null;

alter table public.surveys
  add constraint surveys_owner_account_id_fkey
  foreign key (owner_account_id)
  references public.app_users(user_id)
  on delete set null;

create or replace function app_private.normalize_workspace_slug(p_name text)
returns text
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
  v_slug text;
begin
  v_slug := lower(btrim(coalesce(p_name, '')));
  v_slug := replace(replace(replace(v_slug, 'æ', 'ae'), 'ø', 'o'), 'å', 'a');
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_slug := left(v_slug, 64);
  v_slug := regexp_replace(v_slug, '-+$', '', 'g');

  if length(v_slug) < 3 then
    return 'workspace';
  end if;

  return v_slug;
end;
$$;

create or replace function app_private.hash_workspace_invitation_token(
  p_token text
)
returns text
language sql
immutable
set search_path = public, extensions, app_private
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function app_private.is_workspace_member(
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.account_id = app_private.current_account_id()
      and wm.status = 'active'
  );
$$;

create or replace function app_private.has_workspace_role(
  p_workspace_id uuid,
  p_roles public.workspace_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.account_id = app_private.current_account_id()
      and wm.status = 'active'
      and wm.role = any(p_roles)
  );
$$;

create or replace function app_private.can_create_survey(
  p_owner_account_id uuid,
  p_workspace_id uuid,
  p_visibility public.survey_visibility
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select p_owner_account_id = app_private.current_account_id()
    and (
      (
        p_workspace_id is null
        and p_visibility = 'private'
      )
      or (
        p_workspace_id is not null
        and app_private.is_workspace_member(p_workspace_id)
      )
    );
$$;

create or replace function app_private.can_read_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.surveys s
    where s.id = p_survey_id
      and (
        s.owner_account_id = app_private.current_account_id()
        or (
          s.workspace_id is not null
          and (
            (
              s.visibility = 'workspace'
              and app_private.is_workspace_member(s.workspace_id)
            )
            or app_private.has_workspace_role(
              s.workspace_id,
              array['owner', 'admin']::public.workspace_member_role[]
            )
          )
        )
      )
  );
$$;

create or replace function app_private.can_manage_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.surveys s
    where s.id = p_survey_id
      and (
        s.owner_account_id = app_private.current_account_id()
        or (
          s.workspace_id is not null
          and app_private.has_workspace_role(
            s.workspace_id,
            array['owner', 'admin']::public.workspace_member_role[]
          )
        )
      )
  );
$$;

create or replace function app_private.can_delete_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.can_manage_survey(p_survey_id);
$$;

create or replace function app_private.owns_survey(p_survey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.can_manage_survey(p_survey_id);
$$;

create or replace function app_private.owns_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.questions q
    where q.id = p_question_id
      and app_private.can_manage_survey(q.survey_id)
  );
$$;

create or replace function app_private.owns_response(p_response_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.survey_responses sr
    where sr.id = p_response_id
      and app_private.can_read_survey(sr.survey_id)
  );
$$;

create or replace function app_private.owns_answer(p_answer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.answers a
    join public.survey_responses sr on sr.id = a.response_id
    where a.id = p_answer_id
      and app_private.can_read_survey(sr.survey_id)
  );
$$;

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

  if p_type = 'business' and (
    v_organization_number is null
    or v_organization_number !~ '^[0-9]{9}$'
  ) then
    raise exception 'Business workspaces require a valid organization number.';
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

create or replace function public.create_workspace(
  p_name text,
  p_type public.workspace_type,
  p_organization_number text default null
)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.create_workspace(p_name, p_type, p_organization_number);
$$;

create or replace function app_private.create_workspace_invitation(
  p_workspace_id uuid,
  p_role public.workspace_member_role default 'member',
  p_expires_in_days integer default 14
)
returns text
language plpgsql
security definer
set search_path = public, extensions, app_private
as $$
declare
  v_account_id uuid := app_private.current_account_id();
  v_token text;
  v_token_hash text;
  v_expires_in_days integer := coalesce(p_expires_in_days, 14);
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_role = 'owner' then
    raise exception 'Owner invitations are not supported.';
  end if;

  if not app_private.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Only workspace owners and admins can invite members.';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_token_hash := app_private.hash_workspace_invitation_token(v_token);

  insert into public.workspace_invitations (
    workspace_id,
    token_hash,
    role,
    invited_by_account_id,
    expires_at
  )
  values (
    p_workspace_id,
    v_token_hash,
    coalesce(p_role, 'member'),
    v_account_id,
    now() + make_interval(days => greatest(1, least(v_expires_in_days, 60)))
  );

  return v_token;
end;
$$;

create or replace function public.create_workspace_invitation(
  p_workspace_id uuid,
  p_role public.workspace_member_role default 'member',
  p_expires_in_days integer default 14
)
returns text
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.create_workspace_invitation(
    p_workspace_id,
    p_role,
    p_expires_in_days
  );
$$;

create or replace function app_private.accept_workspace_invitation(
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_account_id uuid := app_private.current_account_id();
  v_token_hash text;
  v_invitation public.workspace_invitations%rowtype;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if nullif(btrim(p_token), '') is null then
    raise exception 'Invitation token is required.';
  end if;

  v_token_hash := app_private.hash_workspace_invitation_token(btrim(p_token));

  select wi.*
    into v_invitation
  from public.workspace_invitations wi
  where wi.token_hash = v_token_hash
    and wi.accepted_at is null
    and wi.revoked_at is null
    and wi.expires_at > now()
  for update;

  if v_invitation.id is null then
    raise exception 'Invitation is invalid or expired.';
  end if;

  insert into public.workspace_members (
    workspace_id,
    account_id,
    role,
    status,
    removed_at
  )
  values (
    v_invitation.workspace_id,
    v_account_id,
    v_invitation.role,
    'active',
    null
  )
  on conflict (workspace_id, account_id)
  do update set
    role = excluded.role,
    status = 'active',
    removed_at = null,
    joined_at = now();

  update public.workspace_invitations
  set
    accepted_at = now(),
    accepted_by_account_id = v_account_id
  where id = v_invitation.id;

  return v_invitation.workspace_id;
end;
$$;

create or replace function public.accept_workspace_invitation(
  p_token text
)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.accept_workspace_invitation(p_token);
$$;

create or replace function app_private.remove_workspace_member(
  p_workspace_id uuid,
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_current_account_id uuid := app_private.current_account_id();
  v_target public.workspace_members%rowtype;
  v_active_owner_count integer;
begin
  if v_current_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if not app_private.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Only workspace owners and admins can remove members.';
  end if;

  select *
    into v_target
  from public.workspace_members
  where workspace_id = p_workspace_id
    and account_id = p_account_id
    and status = 'active'
  for update;

  if v_target.workspace_id is null then
    return;
  end if;

  if v_target.role = 'owner'
     and not app_private.has_workspace_role(
       p_workspace_id,
       array['owner']::public.workspace_member_role[]
     ) then
    raise exception 'Only owners can remove owners.';
  end if;

  select count(*)
    into v_active_owner_count
  from public.workspace_members
  where workspace_id = p_workspace_id
    and role = 'owner'
    and status = 'active';

  if v_target.role = 'owner' and v_active_owner_count <= 1 then
    raise exception 'Cannot remove the last workspace owner.';
  end if;

  update public.workspace_members
  set
    status = 'removed',
    removed_at = now()
  where workspace_id = p_workspace_id
    and account_id = p_account_id;
end;
$$;

create or replace function public.remove_workspace_member(
  p_workspace_id uuid,
  p_account_id uuid
)
returns void
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.remove_workspace_member(p_workspace_id, p_account_id);
$$;

create or replace function app_private.delete_workspace_tree(
  p_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_survey_id uuid;
begin
  if p_workspace_id is null then
    raise exception 'Workspace id is required.';
  end if;

  if not exists (
    select 1 from public.workspaces where id = p_workspace_id
  ) then
    raise exception 'Workspace not found.';
  end if;

  for v_survey_id in
    select s.id
    from public.surveys s
    where s.workspace_id = p_workspace_id
  loop
    perform app_private.delete_survey_tree(v_survey_id);
  end loop;

  delete from public.workspace_invitations
  where workspace_id = p_workspace_id;

  delete from public.workspace_members
  where workspace_id = p_workspace_id;

  delete from public.workspaces
  where id = p_workspace_id;
end;
$$;

create or replace function app_private.delete_workspace(
  p_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.has_workspace_role(
    p_workspace_id,
    array['owner']::public.workspace_member_role[]
  ) then
    raise exception 'Only workspace owners can delete workspaces.';
  end if;

  perform app_private.delete_workspace_tree(p_workspace_id);
end;
$$;

create or replace function public.delete_workspace(
  p_workspace_id uuid
)
returns void
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.delete_workspace(p_workspace_id);
$$;

create or replace function app_private.delete_survey(p_survey_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.can_delete_survey(p_survey_id) then
    raise exception 'Survey not found or not manageable by current account.';
  end if;

  perform app_private.delete_survey_tree(p_survey_id);
end;
$$;

create or replace function app_private.delete_account_data_for_auth_user(
  p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_account_id uuid;
  v_survey_id uuid;
  v_workspace_id uuid;
begin
  if p_auth_user_id is null then
    raise exception 'Auth user id is required.';
  end if;

  select aau.account_id
    into v_account_id
  from public.account_auth_users aau
  where aau.auth_user_id = p_auth_user_id
  limit 1;

  if v_account_id is null then
    return null;
  end if;

  if exists (
    select 1
    from public.workspace_members owner_membership
    where owner_membership.account_id = v_account_id
      and owner_membership.role = 'owner'
      and owner_membership.status = 'active'
      and exists (
        select 1
        from public.workspace_members other_member
        where other_member.workspace_id = owner_membership.workspace_id
          and other_member.account_id <> v_account_id
          and other_member.status = 'active'
      )
      and not exists (
        select 1
        from public.workspace_members other_owner
        where other_owner.workspace_id = owner_membership.workspace_id
          and other_owner.account_id <> v_account_id
          and other_owner.role = 'owner'
          and other_owner.status = 'active'
      )
  ) then
    raise exception 'Transfer workspace ownership before deleting this account.';
  end if;

  for v_workspace_id in
    select wm.workspace_id
    from public.workspace_members wm
    where wm.account_id = v_account_id
      and wm.status = 'active'
      and not exists (
        select 1
        from public.workspace_members other_member
        where other_member.workspace_id = wm.workspace_id
          and other_member.account_id <> v_account_id
          and other_member.status = 'active'
      )
  loop
    perform app_private.delete_workspace_tree(v_workspace_id);
  end loop;

  for v_survey_id in
    select s.id
    from public.surveys s
    where s.owner_account_id = v_account_id
      and s.workspace_id is null
  loop
    perform app_private.delete_survey_tree(v_survey_id);
  end loop;

  update public.workspace_members
  set
    status = 'removed',
    removed_at = now()
  where account_id = v_account_id
    and status = 'active';

  delete from public.app_users
  where user_id = v_account_id;

  return v_account_id;
end;
$$;

create or replace function app_private.prevent_survey_identity_changes_after_responses()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if app_private.survey_has_responses(old.id) and (
    old.id is distinct from new.id
    or old.workspace_id is distinct from new.workspace_id
    or old.slug is distinct from new.slug
    or old.response_mode is distinct from new.response_mode
    or old.published_at is distinct from new.published_at
  ) then
    raise exception 'Survey identity is locked because the survey has submitted responses.';
  end if;

  return new;
end;
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

drop policy if exists "workspaces member select" on public.workspaces;
create policy "workspaces member select"
on public.workspaces
for select
to authenticated
using (app_private.is_workspace_member(id));

drop policy if exists "workspace members member select" on public.workspace_members;
create policy "workspace members member select"
on public.workspace_members
for select
to authenticated
using (app_private.is_workspace_member(workspace_id));

drop policy if exists "workspace invitations manager select" on public.workspace_invitations;
create policy "workspace invitations manager select"
on public.workspace_invitations
for select
to authenticated
using (
  app_private.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
);

drop policy if exists "profiles read workspace members" on public.profiles;
create policy "profiles read workspace members"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them
      on them.workspace_id = me.workspace_id
    where me.account_id = app_private.current_account_id()
      and me.status = 'active'
      and them.account_id = profiles.id
      and them.status = 'active'
  )
);

drop policy if exists "surveys owner select" on public.surveys;
drop policy if exists "surveys owner insert" on public.surveys;
drop policy if exists "surveys owner update" on public.surveys;
drop policy if exists "surveys owner delete" on public.surveys;

create policy "surveys readable select"
on public.surveys
for select
to authenticated
using (app_private.can_read_survey(id));

create policy "surveys create own or workspace"
on public.surveys
for insert
to authenticated
with check (
  app_private.can_create_survey(owner_account_id, workspace_id, visibility)
);

create policy "surveys manageable update"
on public.surveys
for update
to authenticated
using (app_private.can_manage_survey(id))
with check (app_private.can_manage_survey(id));

create policy "surveys manageable delete"
on public.surveys
for delete
to authenticated
using (app_private.can_delete_survey(id));

drop policy if exists "survey sections owner select" on public.survey_sections;
drop policy if exists "survey sections owner insert" on public.survey_sections;
drop policy if exists "survey sections owner update" on public.survey_sections;
drop policy if exists "survey sections owner delete" on public.survey_sections;

create policy "survey sections readable select"
on public.survey_sections
for select
to authenticated
using (app_private.can_read_survey(survey_id));

create policy "survey sections manageable insert"
on public.survey_sections
for insert
to authenticated
with check (app_private.can_manage_survey(survey_id));

create policy "survey sections manageable update"
on public.survey_sections
for update
to authenticated
using (app_private.can_manage_survey(survey_id))
with check (app_private.can_manage_survey(survey_id));

create policy "survey sections manageable delete"
on public.survey_sections
for delete
to authenticated
using (app_private.can_manage_survey(survey_id));

drop policy if exists "questions owner select" on public.questions;
drop policy if exists "questions owner insert" on public.questions;
drop policy if exists "questions owner update" on public.questions;
drop policy if exists "questions owner delete" on public.questions;

create policy "questions readable select"
on public.questions
for select
to authenticated
using (app_private.can_read_survey(survey_id));

create policy "questions manageable insert"
on public.questions
for insert
to authenticated
with check (app_private.can_manage_survey(survey_id));

create policy "questions manageable update"
on public.questions
for update
to authenticated
using (app_private.can_manage_survey(survey_id))
with check (app_private.can_manage_survey(survey_id));

create policy "questions manageable delete"
on public.questions
for delete
to authenticated
using (app_private.can_manage_survey(survey_id));

drop policy if exists "question options owner select" on public.question_options;
drop policy if exists "question options owner insert" on public.question_options;
drop policy if exists "question options owner update" on public.question_options;
drop policy if exists "question options owner delete" on public.question_options;

create policy "question options readable select"
on public.question_options
for select
to authenticated
using (
  exists (
    select 1
    from public.questions q
    where q.id = question_options.question_id
      and app_private.can_read_survey(q.survey_id)
  )
);

create policy "question options manageable insert"
on public.question_options
for insert
to authenticated
with check (app_private.owns_question(question_id));

create policy "question options manageable update"
on public.question_options
for update
to authenticated
using (app_private.owns_question(question_id))
with check (app_private.owns_question(question_id));

create policy "question options manageable delete"
on public.question_options
for delete
to authenticated
using (app_private.owns_question(question_id));

drop policy if exists "survey responses owner select" on public.survey_responses;
create policy "survey responses readable select"
on public.survey_responses
for select
to authenticated
using (app_private.can_read_survey(survey_id));

drop policy if exists "answers owner select" on public.answers;
create policy "answers readable select"
on public.answers
for select
to authenticated
using (app_private.owns_response(response_id));

drop policy if exists "answer options owner select" on public.answer_options;
create policy "answer options readable select"
on public.answer_options
for select
to authenticated
using (app_private.owns_answer(answer_id));

revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_members from anon, authenticated;
revoke all on table public.workspace_invitations from anon, authenticated;

grant select on table public.workspaces to authenticated;
grant select on table public.workspace_members to authenticated;
grant select on table public.workspace_invitations to authenticated;

grant select, insert, update, delete on table public.workspaces to service_role;
grant select, insert, update, delete on table public.workspace_members to service_role;
grant select, insert, update, delete on table public.workspace_invitations to service_role;

grant usage on type public.workspace_type to authenticated, service_role;
grant usage on type public.workspace_status to authenticated, service_role;
grant usage on type public.workspace_member_role to authenticated, service_role;
grant usage on type public.workspace_member_status to authenticated, service_role;
grant usage on type public.survey_visibility to authenticated, service_role;

grant execute on function app_private.is_workspace_member(uuid)
  to authenticated, service_role;
grant execute on function app_private.has_workspace_role(uuid, public.workspace_member_role[])
  to authenticated, service_role;
grant execute on function app_private.can_create_survey(uuid, uuid, public.survey_visibility)
  to authenticated, service_role;
grant execute on function app_private.can_read_survey(uuid)
  to authenticated, service_role;
grant execute on function app_private.can_manage_survey(uuid)
  to authenticated, service_role;
grant execute on function app_private.can_delete_survey(uuid)
  to authenticated, service_role;

revoke all on function public.create_workspace(text, public.workspace_type, text) from public;
revoke all on function public.create_workspace_invitation(uuid, public.workspace_member_role, integer) from public;
revoke all on function public.accept_workspace_invitation(text) from public;
revoke all on function public.remove_workspace_member(uuid, uuid) from public;
revoke all on function public.delete_workspace(uuid) from public;

grant execute on function public.create_workspace(text, public.workspace_type, text)
  to authenticated;
grant execute on function public.create_workspace_invitation(uuid, public.workspace_member_role, integer)
  to authenticated;
grant execute on function public.accept_workspace_invitation(text)
  to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid)
  to authenticated;
grant execute on function public.delete_workspace(uuid)
  to authenticated;

revoke all on function app_private.normalize_workspace_slug(text) from public;
revoke all on function app_private.hash_workspace_invitation_token(text) from public;
revoke all on function app_private.create_workspace(text, public.workspace_type, text) from public;
revoke all on function app_private.create_workspace_invitation(uuid, public.workspace_member_role, integer) from public;
revoke all on function app_private.accept_workspace_invitation(text) from public;
revoke all on function app_private.remove_workspace_member(uuid, uuid) from public;
revoke all on function app_private.delete_workspace_tree(uuid) from public;
revoke all on function app_private.delete_workspace(uuid) from public;
