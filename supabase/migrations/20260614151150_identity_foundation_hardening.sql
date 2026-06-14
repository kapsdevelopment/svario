-- Follow-up hardening after applying the identity foundation.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end
$$;

drop policy if exists "account_auth_users read own auth mapping" on public.account_auth_users;
create policy "account_auth_users read own auth mapping"
  on public.account_auth_users
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);
