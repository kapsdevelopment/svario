begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(15);

insert into public.workspaces (id, name, slug, type)
values
  ('c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'Testarbeidsflate A', 'test-branding-workspace-a', 'team'),
  ('e442d56d-a55e-4fb5-9a95-9e0e4b72ee9f', 'Testarbeidsflate B', 'test-branding-workspace-b', 'team');

insert into app_private.workspace_respondent_branding (workspace_id, display_name, accent_color, logo_png, is_active)
select w.id, w.name, '#345678', decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRWsAAAAASUVORK5CYII=', 'base64'
), true
from public.workspaces w
where w.slug in ('test-branding-workspace-a', 'test-branding-workspace-b');

insert into public.surveys (title, slug, workspace_id, status, starts_at, ends_at, live_only)
values
  ('A', 'test-branding-a', 'c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'published', null, null, false),
  ('B', 'test-branding-b', 'e442d56d-a55e-4fb5-9a95-9e0e4b72ee9f', 'published', null, null, false),
  ('Personlig', 'test-branding-personal', null, 'published', null, null, false),
  ('Kladd', 'test-branding-draft', 'c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'draft', null, null, false),
  ('Planlagt', 'test-branding-future', 'c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'published', now() + interval '1 day', null, false),
  ('Utløpt', 'test-branding-expired', 'c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'published', null, now() - interval '1 day', false),
  ('Stengt', 'test-branding-closed', 'c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'closed', null, null, false),
  ('Bare live', 'test-branding-live', 'c1aaf17c-5960-43e6-8b69-92ccca1fe375', 'published', null, null, true);

select ok(
  (select relrowsecurity from pg_class where oid = 'app_private.workspace_respondent_branding'::regclass),
  'The private branding table has RLS enabled'
);

set local role anon;

select results_eq(
  $$select * from public.get_survey_respondent_branding('test-branding-a')$$,
  $$values (
    'Testarbeidsflate A'::text,
    '#345678'::text,
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRWsAAAAASUVORK5CYII='::text
  )$$,
  'The public response contains exactly the three profile fields'
);
select is(
  (select display_name from public.get_survey_respondent_branding('test-branding-b')),
  'Testarbeidsflate B',
  'Another workspace resolves its own profile'
);

select is_empty($$select * from public.get_survey_respondent_branding('test-branding-personal')$$, 'Personal surveys have no workspace profile');
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-draft')$$, 'Draft surveys expose no profile');
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-future')$$, 'Scheduled surveys expose no profile before opening');
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-expired')$$, 'Expired surveys expose no profile');
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-closed')$$, 'Closed surveys expose no profile');
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-live')$$, 'Live-only surveys expose no profile via the ordinary form');
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-missing')$$, 'Unknown slugs have no profile');

select throws_ok($$select * from app_private.workspace_respondent_branding$$, '42501', null, 'Anonymous callers cannot list profiles');
select throws_ok($$select workspace_id from public.surveys$$, '42501', null, 'Anonymous callers cannot read the survey workspace ID');

set local role authenticated;
select throws_ok($$update app_private.workspace_respondent_branding set is_active = false$$, '42501', null, 'Signed-in users cannot change profiles');
select throws_ok($$select * from app_private.workspace_respondent_branding$$, '42501', null, 'Signed-in users cannot list profiles');

reset role;
update app_private.workspace_respondent_branding set is_active = false
where workspace_id = 'c1aaf17c-5960-43e6-8b69-92ccca1fe375';

set local role anon;
select is_empty($$select * from public.get_survey_respondent_branding('test-branding-a')$$, 'Deactivation removes public profile data');

reset role;
select * from finish();
rollback;
