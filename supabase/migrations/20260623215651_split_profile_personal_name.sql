alter table public.profiles
  add column if not exists personal_name text;

update public.profiles
set personal_name = nullif(btrim(display_name), '')
where personal_name is null
  and display_name is not null;

alter table public.profiles
  drop constraint if exists profiles_personal_name_not_empty,
  drop constraint if exists profiles_personal_name_length,
  add constraint profiles_personal_name_not_empty check (
    personal_name is null or length(btrim(personal_name)) > 0
  ),
  add constraint profiles_personal_name_length check (
    personal_name is null or length(personal_name) <= 120
  );

create or replace function app_private.sync_profile_personal_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.personal_name := nullif(btrim(coalesce(new.personal_name, '')), '');

    if new.personal_name is null then
      new.personal_name := nullif(btrim(coalesce(new.display_name, '')), '');
    end if;

    new.display_name := new.personal_name;
    return new;
  end if;

  if new.personal_name is distinct from old.personal_name then
    new.personal_name := nullif(btrim(coalesce(new.personal_name, '')), '');
    new.display_name := new.personal_name;
    return new;
  end if;

  if new.display_name is distinct from old.display_name then
    new.display_name := nullif(btrim(coalesce(new.display_name, '')), '');
    new.personal_name := new.display_name;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_personal_name on public.profiles;
create trigger profiles_sync_personal_name
  before insert or update of personal_name, display_name on public.profiles
  for each row execute function app_private.sync_profile_personal_name();

revoke all on function app_private.sync_profile_personal_name()
  from public, anon, authenticated;

grant update (personal_name)
  on public.profiles
  to authenticated;
