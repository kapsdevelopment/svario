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
insert into app_private.svario_admins(account_id) values ('21000000-0000-4000-8000-000000000004');
select set_config('test.base_new_requests', (select count(*) from app_private.workspace_branding_requests r join public.workspaces w on w.id=r.workspace_id and w.status='active' where r.status='new')::text, true);
insert into public.surveys(title, slug, workspace_id, status) values ('Interesse', 'interest-logo-open', '31000000-0000-4000-8000-000000000001', 'published');

select ok((select relrowsecurity from pg_class where oid='app_private.workspace_branding_access'::regclass), 'Branding permission storage has RLS');
select ok((select relrowsecurity from pg_class where oid='app_private.workspace_branding_requests'::regclass), 'Contact and request storage has RLS');
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select is_allowed from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')), false, 'Free workspace starts without branding permission');
select throws_ok($$select * from public.get_my_branding_access('31000000-0000-4000-8000-000000000002')$$, '42501', null, 'Owner cannot read another company access status');
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000002', 'Kontakt', 'test@example.com', '')$$, '42501', null, 'Owner cannot request for another company');
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000001', '', 'test@example.com', '')$$, '22023', null, 'Server requires a contact name');
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Kontakt', 'bad email', '')$$, '22023', null, 'Server validates contact email');
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Kontakt', 'test@example.com', repeat('x',2001))$$, '22023', null, 'Server bounds the comment');
select set_config('test.branding_request', public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Eier', 'test@example.com', 'Vi ønsker logo')::text, true);
select is(public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Dobbel', 'other@example.com', 'retry')::text, current_setting('test.branding_request'), 'Repeated submissions return the same request');
select is((select request_status from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')), 'new', 'Customer sees the pending request');
select is((select is_allowed from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')), false, 'Sending interest does not grant permission');
select throws_ok($$select * from public.list_workspace_branding_requests()$$, '42501', null, 'Customer cannot read central inbox');
select throws_ok($$select public.count_new_branding_requests()$$, '42501', null, 'Customer cannot read central notification count');
select throws_ok($$select public.review_workspace_branding_request(current_setting('test.branding_request')::uuid, 1, 'approved')$$, '42501', null, 'Customer cannot approve their own request');
select throws_ok($$insert into app_private.workspace_branding_access(workspace_id) values ('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Customer cannot grant access directly');
select throws_ok($$select * from app_private.workspace_branding_requests$$, '42501', null, 'Customer cannot read raw contact storage');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
select is(public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Admin', 'admin@example.com', '')::text, current_setting('test.branding_request'), 'Another workspace admin cannot create a duplicate');
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Medlem', 'test@example.com', '')$$, '42501', null, 'Ordinary members cannot request branding');
select throws_ok($$select * from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Ordinary members cannot read request status');

set local role service_role;
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 0,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC')$$,
  '42501', null, 'The database denies the first upload before approval');
set local role anon;
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Anon', 'test@example.com', '')$$, '42501', null, 'Anonymous callers cannot request branding');
select throws_ok($$select * from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Anonymous callers cannot read request status');
select throws_ok($$select * from public.list_workspace_branding_requests()$$, '42501', null, 'Anonymous callers cannot list requests');
select throws_ok($$select public.count_new_branding_requests()$$, '42501', null, 'Anonymous callers cannot read notification count');
select throws_ok($$select public.review_workspace_branding_request(current_setting('test.branding_request')::uuid, 1, 'approved')$$, '42501', null, 'Anonymous callers cannot grant permission');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000004';
select is(public.count_new_branding_requests(), current_setting('test.base_new_requests')::integer + 1, 'Svario admin sees one new request');
select is((select contact_name from public.list_workspace_branding_requests() where id=current_setting('test.branding_request')::uuid), 'Eier', 'Duplicate requests preserve the original contact');
select is((select message from public.list_workspace_branding_requests() where id=current_setting('test.branding_request')::uuid), 'Vi ønsker logo', 'Inbox includes the original comment');
select lives_ok($$select public.review_workspace_branding_request(current_setting('test.branding_request')::uuid, 1, 'in_review')$$, 'Admin can take a request for review');
select is(public.count_new_branding_requests(), current_setting('test.base_new_requests')::integer, 'Taking a request for review clears its new notification');
select throws_ok($$select public.review_workspace_branding_request(current_setting('test.branding_request')::uuid, 1, 'approved')$$, 'P0001', null, 'Stale admin decisions are rejected');
select lives_ok($$select public.review_workspace_branding_request(current_setting('test.branding_request')::uuid, 2, 'approved')$$, 'Admin grants permission without uploading a logo');
select throws_ok($$select public.review_workspace_branding_request(current_setting('test.branding_request')::uuid, 3, 'closed')$$, '22023', null, 'Closing a request cannot silently undo an approval');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select is_allowed from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')), true, 'Customer sees permission after approval');
select is((select request_status from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')), 'approved', 'Approval and permission are saved together');
select is((select count(*) from public.get_my_workspace_branding('31000000-0000-4000-8000-000000000001')), 0::bigint, 'No placeholder logo is created');
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000001', 'Eier', 'test@example.com', '')$$, '22023', null, 'Approved customers cannot send a new interest request');
set local role anon;
select is((select count(*) from public.get_survey_respondent_branding('interest-logo-open')), 0::bigint, 'Approval alone exposes no profile to respondents');

set local role service_role;
select is(public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 0,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC'),
  1::bigint, 'Approved owner can upload their first validated logo');
select throws_ok($$select public.replace_workspace_branding_logo('11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 0,
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAJElEQVR4nGPUiHL7z0BDwERLw0Fg1AKCYNQCgmDUAoKA5hYAAEq+Ad+/twa0AAAAAElFTkSuQmCC')$$,
  'P0001', null, 'Retrying a first upload cannot overwrite the saved logo');
set local role anon;
select is((select display_name from public.get_survey_respondent_branding('interest-logo-open')), 'Egen bedrift', 'The first logo becomes visible with the workspace name');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select set_config('test.closed_request', public.request_workspace_branding('31000000-0000-4000-8000-000000000003', 'Eier', 'test@example.com', '')::text, true);
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000004';
select lives_ok($$select public.review_workspace_branding_request(current_setting('test.closed_request')::uuid, 1, 'closed')$$, 'Admin can close an interest request');
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select is_allowed from public.get_my_branding_access('31000000-0000-4000-8000-000000000003')), false, 'Closing does not grant permission');
select is(public.request_workspace_branding('31000000-0000-4000-8000-000000000003', 'Eier igjen', 'test@example.com', '')::text, current_setting('test.closed_request'), 'Customer can reopen a closed request without a duplicate');
select is((select request_status from public.get_my_branding_access('31000000-0000-4000-8000-000000000003')), 'new', 'Reopened interest becomes new again');

reset role;
update public.workspace_members set status='removed', removed_at=now() where account_id='21000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
select throws_ok($$select * from public.get_my_branding_access('31000000-0000-4000-8000-000000000001')$$, '42501', null, 'Removed admins lose access with the same session');
reset role;
update public.accounts set status='blocked' where id='21000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select throws_ok($$select public.request_workspace_branding('31000000-0000-4000-8000-000000000003', 'Eier', 'test@example.com', '')$$, '42501', null, 'Blocked accounts cannot request');
reset role;
update public.workspaces set status='deleted' where id='31000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000004';
select is(public.count_new_branding_requests(), current_setting('test.base_new_requests')::integer, 'Deleted companies do not appear in notifications');
select is((select count(*) from public.list_workspace_branding_requests() where id=current_setting('test.closed_request')::uuid), 0::bigint, 'Deleted companies are hidden from the inbox');
reset role;
delete from app_private.svario_admins where account_id='21000000-0000-4000-8000-000000000004';
set local role authenticated;
select throws_ok($$select public.count_new_branding_requests()$$, '42501', null, 'Revoked Svario admins cannot read notifications');
reset role;
select * from finish();
rollback;
