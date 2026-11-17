-- A stale form is an HTTP 409 business conflict, not a retryable serialization
-- failure. PostgREST may retry 40001 transactions, delaying the browser response.
create or replace function app_private.instance_update_signup_policy(
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
    raise exception 'Registreringsreglene er endret. Last inn på nytt før du lagrer.' using errcode = 'PT409';
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
