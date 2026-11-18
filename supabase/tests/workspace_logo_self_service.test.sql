begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id, email)
select ('11000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'logo-self-' || n || '@example.com'
from generate_series(1, 4) n;
insert into public.app_users (user_id)
select ('21000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 4) n;
insert into public.accounts (id)
select ('21000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 4) n;
insert into public.account_auth_users (auth_user_id, account_id)
select ('11000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('21000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 4) n;
insert into public.workspaces (id, name, slug, type) values
  ('31000000-0000-4000-8000-000000000001', 'Egen bedrift', 'self-logo-own', 'team'),
  ('31000000-0000-4000-8000-000000000002', 'Annen bedrift', 'self-logo-other', 'team'),
  ('31000000-0000-4000-8000-000000000003', 'Uten profil', 'self-logo-empty', 'team');
insert into public.workspace_members (workspace_id, account_id, role) values
  ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'owner'),
  ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002', 'admin'),
  ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000003', 'member'),
  ('31000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', 'owner');
insert into app_private.workspace_respondent_branding (workspace_id, display_name, accent_color, logo_png, is_active)
select w.id, w.name, '#345678', decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRWsAAAAASUVORK5CYII=', 'base64'
), false from public.workspaces w where slug in ('self-logo-own', 'self-logo-other');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select display_name from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')), 'Egen bedrift', 'Owner can preview their own inactive profile');
select is((select count(*) from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000003')), 0::bigint, 'Owner sees an empty state before provisioning');
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000002')$$, '42501', null, 'Changing the workspace ID cannot reveal another company');
select throws_ok($$select * from public.list_branding_workspaces('')$$, '42501', null, 'Owner cannot list all companies');
select throws_ok($$select public.set_workspace_respondent_branding_active('31000000-0000-4000-8000-000000000001', true)$$, '42501', null, 'Owner cannot activate a B-profile');
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, null)$$, '42501', null, 'Owner cannot bypass image validation');
select throws_ok($$select * from app_private.workspace_respondent_branding$$, '42501', null, 'Owner cannot read raw private storage');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
select is((select display_name from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')), 'Egen bedrift', 'Workspace admin can preview their company');
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Ordinary member cannot manage branding');
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000004';
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Outsider cannot preview branding');

set local role anon;
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Anonymous users cannot use the editor');
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, null)$$, '42501', null, 'Anonymous users cannot replace logos');

set local role service_role;
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000001', 1, null)$$, '42501', null, 'Database rejects ordinary members on writes');
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000004', '31000000-0000-4000-8000-000000000001', 1, null)$$, '42501', null, 'Database rejects outsiders on writes');
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000002', 1, null)$$, '42501', null, 'Database rejects cross-company writes');
select is(public.replace_workspace_branding_logo(
  '11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'
), 2::bigint, 'Owner can replace the logo through the validating server');
select is(public.replace_workspace_branding_logo(
  '11000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 2,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'
), 3::bigint, 'Workspace admin can also replace the logo');
select throws_ok($$select public.replace_workspace_branding_logo(
  '11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'
)$$, 'P0001', null, 'Stale revisions cannot overwrite later edits');
select throws_ok($$select public.replace_workspace_branding_logo(
  '11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000003', 1,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'
)$$, '42501', null, 'Self-service cannot provision a B-profile without permission');
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 3, 'c3Zn')$$, '22023', null, 'Database also rejects non-PNG payloads');

reset role;
select is((select display_name || accent_color || is_active::text from app_private.workspace_respondent_branding where workspace_id = '31000000-0000-4000-8000-000000000001'), 'Egen bedrift#345678false', 'Name, color and activation are preserved');
select is((select revision from app_private.workspace_respondent_branding where workspace_id = '31000000-0000-4000-8000-000000000002'), 1::bigint, 'Other company profile is unchanged');
select ok((select relrowsecurity from pg_class where oid = 'app_private.workspace_respondent_branding'::regclass), 'Private logo storage still has RLS');
update public.workspace_members set status = 'removed', removed_at = now()
where account_id = '21000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Revocation takes effect with the same session');
set local role service_role;
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 3, null)$$, '42501', null, 'Revoked workspace admin cannot save');

reset role;
update public.accounts set status = 'blocked' where id = '21000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Blocked owner cannot preview');
set local role service_role;
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 3, null)$$, '42501', null, 'Blocked owner cannot save');
reset role;
update public.accounts set status = 'active' where id = '21000000-0000-4000-8000-000000000001';
update public.workspaces set status = 'deleted' where id = '31000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select * from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Deleted workspace cannot be managed');
reset role;
select * from finish();
rollback;
