-- Run only against an isolated disposable test database with migrations applied.
-- Every fixture and policy change rolls back; no production identities are used.
begin;
insert into auth.users(id,email,email_confirmed_at,created_at) values
 ('10000000-0000-4000-8000-000000000001','admin@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000002','ordinary@example.test',now(),now()),
 ('10000000-0000-4000-8000-000000000003','pending@example.test',null,now());
insert into public.app_users(user_id) values
 ('20000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002');
insert into public.accounts(id) select user_id from public.app_users where user_id::text like '20000000-%';
insert into public.account_auth_users(auth_user_id,account_id) values
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
insert into app_private.instance_admins(account_id) values ('20000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
  if public.instance_is_admin() then raise exception 'Inactive instance must not enable admin'; end if;
end $$;
reset role;
update app_private.instance_registration_policy set enabled=true;
set local role authenticated;
do $$ declare p jsonb; page jsonb; begin
  if not public.instance_is_admin() then raise exception 'Domain admin mapping failed'; end if;
  page := public.instance_list_users(0,50);
  if (page->>'total')::int < 3 then raise exception 'Missing registered/pending users'; end if;
  if page::text like '%encrypted_password%' then raise exception 'Sensitive field exposed'; end if;
  p := public.instance_update_signup_policy('domains',array['Example.TEST'],1);
  if p->'allowedDomains' <> '["example.test"]'::jsonb then raise exception 'Normalization failed'; end if;
  begin
    perform public.instance_update_signup_policy('open','{}',1);
    raise exception 'Stale write accepted';
  exception when sqlstate 'PT409' then null; end;
  begin
    perform public.instance_update_signup_policy('domains',array['*.test'],2);
    raise exception 'Wildcard accepted';
  exception when raise_exception then if sqlerrm='Wildcard accepted' then raise; end if; end;
  begin
    update app_private.instance_registration_policy set mode='open';
    raise exception 'Direct policy write accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
  if public.instance_is_admin() then raise exception 'Ordinary user became admin'; end if;
  begin perform public.instance_list_users(); raise exception 'Ordinary user read users';
  exception when insufficient_privilege then null; end;
  begin perform public.instance_update_signup_policy('open','{}',2); raise exception 'Ordinary user edited policy';
  exception when insufficient_privilege then null; end;
  begin insert into app_private.instance_admins(account_id) values ('20000000-0000-4000-8000-000000000002');
    raise exception 'Self escalation accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  perform public.instance_signup_policy();
  begin perform public.instance_list_users(); raise exception 'Anon read users';
  exception when insufficient_privilege then null; end;
  begin perform app_private.before_user_created('{"user":{"email":"user@example.test"}}');
    raise exception 'Anon invoked auth hook'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role supabase_auth_admin;
do $$ declare email text; result jsonb; begin
  if app_private.before_user_created('{"user":{"email":"USER@EXAMPLE.TEST"}}') <> '{}'::jsonb then
    raise exception 'Exact domain refused'; end if;
  foreach email in array array['a@sub.example.test','a@example.test.evil','a@evil-example.test','a@b@example.test',''] loop
    result := app_private.before_user_created(jsonb_build_object('user',jsonb_build_object('email',email,
      'user_metadata',jsonb_build_object('role','admin','bypass',true))));
    if result->'error' is null then raise exception 'Domain bypass'; end if;
  end loop;
end $$;
reset role;
update app_private.instance_registration_policy set mode='closed', allowed_domains='{}';
set local role supabase_auth_admin;
do $$ begin
  if app_private.before_user_created('{"user":{"email":"user@example.test"}}')->'error' is null then
    raise exception 'Closed signup accepted'; end if;
end $$;
reset role;
update app_private.instance_registration_policy set mode='open';
set local role supabase_auth_admin;
do $$ begin
  if app_private.before_user_created('{"user":{"email":"user@different.test"}}') <> '{}'::jsonb then
    raise exception 'Open signup refused'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from app_private.instance_policy_audit where actor_account_id='20000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Audit missing'; end if;
end $$;
rollback;
