begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(34);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'branding-admin-owner@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'branding-admin-outsider@example.com'),
  ('10000000-0000-4000-8000-000000000003', 'branding-admin-test@example.com');

insert into public.app_users (user_id) values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000003');

insert into public.accounts (id)
select user_id from public.app_users where user_id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003'
);

insert into public.account_auth_users (auth_user_id, account_id) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003');

insert into app_private.svario_admins values ('20000000-0000-4000-8000-000000000003');

insert into public.workspaces (id, name, slug, type, status) values
  ('30000000-0000-4000-8000-000000000001', 'Nordøya', 'test-profilering-north', 'team', 'active'),
  ('30000000-0000-4000-8000-000000000002', 'Sørøya', 'test-profilering-south', 'team', 'active'),
  ('30000000-0000-4000-8000-000000000003', 'Slettet', 'test-profilering-deleted', 'team', 'deleted');

insert into public.workspace_members (workspace_id, account_id, role) values (
  '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'owner'
);

insert into app_private.workspace_respondent_branding (workspace_id, display_name, accent_color, logo_png, is_active)
select w.id, 'Nordøya B', '#345678', decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRWsAAAAASUVORK5CYII=', 'base64'
), true
from public.workspaces w where w.slug in ('test-profilering-north', 'test-profilering-deleted');

insert into public.surveys (title, slug, workspace_id, status) values (
  'Et åpent skjema', 'test-profilering-open', '30000000-0000-4000-8000-000000000001', 'published'
);

set local role anon;
select throws_ok($$select public.is_svario_admin()$$, '42501', null, 'Anonymous callers cannot check admin roles');
select throws_ok($$select * from public.list_branding_workspaces('')$$, '42501', null, 'Anonymous callers cannot list workplaces');
select throws_ok($$select * from public.get_workspace_respondent_branding('30000000-0000-4000-8000-000000000001')$$, '42501', null, 'Anonymous callers cannot read admin previews');
select throws_ok($$select public.set_workspace_respondent_branding_active('30000000-0000-4000-8000-000000000001', false)$$, '42501', null, 'Anonymous callers cannot deactivate profiles');

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"role":"svario_admin"}}';
select is((select count(*) from public.workspaces where id = '30000000-0000-4000-8000-000000000001'), 1::bigint, 'The caller is the actual workspace owner');
select is(public.is_svario_admin(), false, 'Workspace ownership and user metadata do not grant Svario admin');
select throws_ok($$select * from public.list_branding_workspaces('')$$, '42501', null, 'A workspace owner cannot list workspace profiles');
select throws_ok($$select * from public.get_workspace_respondent_branding('30000000-0000-4000-8000-000000000001')$$, '42501', null, 'A workspace owner cannot read their workspace admin preview');
select throws_ok($$select public.set_workspace_respondent_branding_active('30000000-0000-4000-8000-000000000001', false)$$, '42501', null, 'A workspace owner cannot change the profile');
select throws_ok($$insert into app_private.svario_admins values ('20000000-0000-4000-8000-000000000001')$$, '42501', null, 'A workspace owner cannot grant themselves the role');

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(public.is_svario_admin(), false, 'An unrelated account is not a Svario admin');
select throws_ok($$select * from public.get_workspace_respondent_branding('30000000-0000-4000-8000-000000000001')$$, '42501', null, 'An unrelated account cannot fetch preview data');

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}';
select ok(public.is_svario_admin(), 'The assigned domain account is a Svario admin');
select results_eq(
  $$select slug from public.list_branding_workspaces('test-profilering') order by slug$$,
  $$values ('test-profilering-north'::text), ('test-profilering-south'::text)$$,
  'An admin can search workspaces across memberships, excluding deleted workspaces'
);
select is_empty($$select * from public.get_workspace_respondent_branding('30000000-0000-4000-8000-000000000002')$$, 'A workspace without a profile has no preview');
select throws_ok($$select public.set_workspace_respondent_branding_active('30000000-0000-4000-8000-000000000003', true)$$, 'P0002', null, 'A deleted workspace cannot be activated');
select is(public.set_workspace_respondent_branding_active('30000000-0000-4000-8000-000000000001', false), false, 'An admin can deactivate the profile');
select is(
  (select display_name from public.get_workspace_respondent_branding('30000000-0000-4000-8000-000000000001') where not is_active),
  'Nordøya B',
  'An admin can still preview a deactivated profile'
);

set local role anon;
select is_empty($$select * from public.get_survey_respondent_branding('test-profilering-open')$$, 'Respondents see standard Svario after deactivation');

set local role authenticated;
select ok(public.set_workspace_respondent_branding_active('30000000-0000-4000-8000-000000000001', true), 'An admin can reactivate the profile');

set local role anon;
select is((select display_name from public.get_survey_respondent_branding('test-profilering-open')), 'Nordøya B', 'The same public link shows the profile again');

reset role;
set local role authenticated;
select throws_ok($$select public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Ny profil', '#345678', 0, null
)$$, '42501', null, 'Even Svario admins must submit content through the image-validating endpoint');
select is((select revision from public.get_workspace_branding_editor('30000000-0000-4000-8000-000000000001')), 3::bigint, 'The editor sees the revision after two status changes');

set local role service_role;
select throws_ok($$select public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Ny profil', '#345678', 0, null
)$$, '42501', null, 'The server save rechecks the domain admin role');
select is(public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Ny profil', '#345678', 0,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'
), 1::bigint, 'The validating server can create a profile');
select throws_ok($$select public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Overskriv', '#345678', 0, null
)$$, 'P0001', null, 'A retried create cannot overwrite an existing profile');
select is(public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Redigert profil', '#234567', 1, null
), 2::bigint, 'Editing name and accent retains the existing logo');
select throws_ok($$select public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Gammel versjon', '#345678', 1, null
)$$, 'P0001', null, 'A stale edit cannot overwrite a newer profile');
select throws_ok($$select public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', ' ', '#345678', 2, null
)$$, '22023', null, 'The database validates display names');
select throws_ok($$select public.save_workspace_respondent_branding(
  '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'Ugyldig farge', 'red', 2, null
)$$, '22023', null, 'The database validates accent colors');
set local role authenticated;
select is((select display_name from public.get_workspace_branding_editor('30000000-0000-4000-8000-000000000002') where not is_active), 'Redigert profil', 'A new profile remains inactive until explicitly activated');

reset role;
update public.accounts set status = 'blocked' where id = '20000000-0000-4000-8000-000000000003';
set local role authenticated;
select throws_ok($$select * from public.list_branding_workspaces('')$$, '42501', null, 'A blocked account cannot use its admin role');

reset role;
update public.accounts set status = 'active' where id = '20000000-0000-4000-8000-000000000003';
delete from app_private.svario_admins where account_id = '20000000-0000-4000-8000-000000000003';
set local role authenticated;
select is(public.is_svario_admin(), false, 'Revocation takes effect with the same claims');
select throws_ok($$select public.set_workspace_respondent_branding_active('30000000-0000-4000-8000-000000000001', false)$$, '42501', null, 'A revoked admin cannot write with the old session');

reset role;
select * from finish();
rollback;
