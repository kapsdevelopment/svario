do $$
begin
  if not exists (select 1 from pg_type where typname = 'survey_status') then
    create type public.survey_status as enum ('draft', 'published', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'survey_response_mode') then
    create type public.survey_response_mode as enum ('anonymous', 'identified');
  end if;

  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type public.question_type as enum ('multiple_choice', 'free_text', 'likert_1_5');
  end if;
end $$;

create table public.surveys (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_account_id uuid not null references public.app_users(user_id) on delete cascade,
  title text not null,
  description text,
  slug text not null unique,
  status public.survey_status not null default 'draft',
  response_mode public.survey_response_mode not null default 'anonymous',
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surveys_title_not_empty check (length(btrim(title)) > 0),
  constraint surveys_slug_format check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  constraint surveys_valid_duration check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.survey_sections (
  id uuid primary key default extensions.gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  title text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_sections_sort_order_non_negative check (sort_order >= 0),
  constraint survey_sections_unique_sort_order unique (survey_id, sort_order)
);

create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  section_id uuid references public.survey_sections(id) on delete set null,
  type public.question_type not null,
  prompt text not null,
  description text,
  is_required boolean not null default true,
  allow_multiple boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_prompt_not_empty check (length(btrim(prompt)) > 0),
  constraint questions_sort_order_non_negative check (sort_order >= 0),
  constraint questions_unique_sort_order unique (survey_id, sort_order),
  constraint questions_allow_multiple_only_for_choices check (type = 'multiple_choice' or allow_multiple = false)
);

create table public.question_options (
  id uuid primary key default extensions.gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  value text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_options_label_not_empty check (length(btrim(label)) > 0),
  constraint question_options_sort_order_non_negative check (sort_order >= 0),
  constraint question_options_unique_sort_order unique (question_id, sort_order)
);

create table public.survey_responses (
  id uuid primary key default extensions.gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete restrict,
  response_mode public.survey_response_mode not null,
  created_by_account_id uuid references public.app_users(user_id) on delete set null,
  respondent_name text,
  respondent_email text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint survey_responses_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint survey_responses_no_identity_for_anonymous check (
    response_mode = 'identified'
    or (
      created_by_account_id is null
      and respondent_name is null
      and respondent_email is null
    )
  )
);

create table public.answers (
  id uuid primary key default extensions.gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  free_text text,
  likert_value smallint,
  created_at timestamptz not null default now(),
  constraint answers_one_per_question unique (response_id, question_id),
  constraint answers_likert_value_range check (likert_value is null or likert_value between 1 and 5)
);

create table public.answer_options (
  answer_id uuid not null references public.answers(id) on delete cascade,
  option_id uuid not null references public.question_options(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (answer_id, option_id)
);

create index surveys_owner_account_id_idx on public.surveys(owner_account_id);
create index surveys_public_lookup_idx on public.surveys(status, starts_at, ends_at);
create index survey_sections_survey_id_sort_order_idx on public.survey_sections(survey_id, sort_order);
create index questions_survey_id_sort_order_idx on public.questions(survey_id, sort_order);
create index questions_section_id_idx on public.questions(section_id);
create index question_options_question_id_sort_order_idx on public.question_options(question_id, sort_order);
create index survey_responses_survey_id_submitted_at_idx on public.survey_responses(survey_id, submitted_at desc);
create index survey_responses_created_by_account_id_idx on public.survey_responses(created_by_account_id);
create index answers_response_id_idx on public.answers(response_id);
create index answers_question_id_idx on public.answers(question_id);
create index answer_options_option_id_idx on public.answer_options(option_id);

create trigger surveys_set_updated_at
  before update on public.surveys
  for each row execute function app_private.set_updated_at();

create trigger survey_sections_set_updated_at
  before update on public.survey_sections
  for each row execute function app_private.set_updated_at();

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function app_private.set_updated_at();

create trigger question_options_set_updated_at
  before update on public.question_options
  for each row execute function app_private.set_updated_at();

create or replace function app_private.owns_survey(p_survey_id uuid)
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
      and s.owner_account_id = app_private.current_account_id()
  );
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
    join public.surveys s on s.id = q.survey_id
    where q.id = p_question_id
      and s.owner_account_id = app_private.current_account_id()
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
    join public.surveys s on s.id = sr.survey_id
    where sr.id = p_response_id
      and s.owner_account_id = app_private.current_account_id()
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
    join public.surveys s on s.id = sr.survey_id
    where a.id = p_answer_id
      and s.owner_account_id = app_private.current_account_id()
  );
$$;

create or replace function app_private.is_survey_publicly_answerable(p_survey_id uuid)
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
      and s.status = 'published'
      and (s.starts_at is null or s.starts_at <= now())
      and (s.ends_at is null or s.ends_at > now())
  );
$$;

create or replace function app_private.is_question_publicly_answerable(p_question_id uuid)
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
      and app_private.is_survey_publicly_answerable(q.survey_id)
  );
$$;

revoke all on function app_private.owns_survey(uuid) from public;
revoke all on function app_private.owns_question(uuid) from public;
revoke all on function app_private.owns_response(uuid) from public;
revoke all on function app_private.owns_answer(uuid) from public;
revoke all on function app_private.is_survey_publicly_answerable(uuid) from public;
revoke all on function app_private.is_question_publicly_answerable(uuid) from public;

grant usage on schema app_private to anon, authenticated, service_role;
grant execute on function app_private.owns_survey(uuid) to authenticated, service_role;
grant execute on function app_private.owns_question(uuid) to authenticated, service_role;
grant execute on function app_private.owns_response(uuid) to authenticated, service_role;
grant execute on function app_private.owns_answer(uuid) to authenticated, service_role;
grant execute on function app_private.is_survey_publicly_answerable(uuid) to anon, service_role;
grant execute on function app_private.is_question_publicly_answerable(uuid) to anon, service_role;

alter table public.surveys enable row level security;
alter table public.survey_sections enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.survey_responses enable row level security;
alter table public.answers enable row level security;
alter table public.answer_options enable row level security;

create policy "surveys owner select"
on public.surveys
for select
to authenticated
using (owner_account_id = (select app_private.current_account_id()));

create policy "surveys owner insert"
on public.surveys
for insert
to authenticated
with check (owner_account_id = (select app_private.current_account_id()));

create policy "surveys owner update"
on public.surveys
for update
to authenticated
using (owner_account_id = (select app_private.current_account_id()))
with check (owner_account_id = (select app_private.current_account_id()));

create policy "surveys owner delete"
on public.surveys
for delete
to authenticated
using (owner_account_id = (select app_private.current_account_id()));

create policy "surveys public read published"
on public.surveys
for select
to anon
using (app_private.is_survey_publicly_answerable(id));

create policy "survey sections owner select"
on public.survey_sections
for select
to authenticated
using (app_private.owns_survey(survey_id));

create policy "survey sections owner insert"
on public.survey_sections
for insert
to authenticated
with check (app_private.owns_survey(survey_id));

create policy "survey sections owner update"
on public.survey_sections
for update
to authenticated
using (app_private.owns_survey(survey_id))
with check (app_private.owns_survey(survey_id));

create policy "survey sections owner delete"
on public.survey_sections
for delete
to authenticated
using (app_private.owns_survey(survey_id));

create policy "survey sections public read published"
on public.survey_sections
for select
to anon
using (app_private.is_survey_publicly_answerable(survey_id));

create policy "questions owner select"
on public.questions
for select
to authenticated
using (app_private.owns_survey(survey_id));

create policy "questions owner insert"
on public.questions
for insert
to authenticated
with check (app_private.owns_survey(survey_id));

create policy "questions owner update"
on public.questions
for update
to authenticated
using (app_private.owns_survey(survey_id))
with check (app_private.owns_survey(survey_id));

create policy "questions owner delete"
on public.questions
for delete
to authenticated
using (app_private.owns_survey(survey_id));

create policy "questions public read published"
on public.questions
for select
to anon
using (app_private.is_survey_publicly_answerable(survey_id));

create policy "question options owner select"
on public.question_options
for select
to authenticated
using (app_private.owns_question(question_id));

create policy "question options owner insert"
on public.question_options
for insert
to authenticated
with check (app_private.owns_question(question_id));

create policy "question options owner update"
on public.question_options
for update
to authenticated
using (app_private.owns_question(question_id))
with check (app_private.owns_question(question_id));

create policy "question options owner delete"
on public.question_options
for delete
to authenticated
using (app_private.owns_question(question_id));

create policy "question options public read published"
on public.question_options
for select
to anon
using (app_private.is_question_publicly_answerable(question_id));

create policy "survey responses owner select"
on public.survey_responses
for select
to authenticated
using (app_private.owns_survey(survey_id));

create policy "answers owner select"
on public.answers
for select
to authenticated
using (app_private.owns_response(response_id));

create policy "answer options owner select"
on public.answer_options
for select
to authenticated
using (app_private.owns_answer(answer_id));

revoke all on table public.surveys from anon, authenticated;
revoke all on table public.survey_sections from anon, authenticated;
revoke all on table public.questions from anon, authenticated;
revoke all on table public.question_options from anon, authenticated;
revoke all on table public.survey_responses from anon, authenticated;
revoke all on table public.answers from anon, authenticated;
revoke all on table public.answer_options from anon, authenticated;

grant select (id, title, description, slug, status, response_mode, starts_at, ends_at, published_at) on public.surveys to anon;
grant select (id, survey_id, title, description, sort_order) on public.survey_sections to anon;
grant select (id, survey_id, section_id, type, prompt, description, is_required, allow_multiple, sort_order) on public.questions to anon;
grant select (id, question_id, label, value, sort_order) on public.question_options to anon;

grant select, insert, update, delete on table public.surveys to authenticated;
grant select, insert, update, delete on table public.survey_sections to authenticated;
grant select, insert, update, delete on table public.questions to authenticated;
grant select, insert, update, delete on table public.question_options to authenticated;
grant select on table public.survey_responses to authenticated;
grant select on table public.answers to authenticated;
grant select on table public.answer_options to authenticated;

grant select, insert, update, delete on table public.surveys to service_role;
grant select, insert, update, delete on table public.survey_sections to service_role;
grant select, insert, update, delete on table public.questions to service_role;
grant select, insert, update, delete on table public.question_options to service_role;
grant select, insert, update, delete on table public.survey_responses to service_role;
grant select, insert, update, delete on table public.answers to service_role;
grant select, insert, update, delete on table public.answer_options to service_role;
