create table app_private.workspace_respondent_branding (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  accent_color text not null check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_png bytea not null check (
    octet_length(logo_png) between 9 and 65536
    and substring(logo_png for 8) = decode('89504e470d0a1a0a', 'hex')
  ),
  is_active boolean not null default false
);

alter table app_private.workspace_respondent_branding enable row level security;
revoke all on app_private.workspace_respondent_branding from public, anon, authenticated;

-- Resolve workspace ownership inside the database. The anonymous client has access
-- to these three presentation fields only, and only while the form is answerable.
create function app_private.get_survey_respondent_branding(p_slug text)
returns table (display_name text, accent_color text, logo_png_base64 text)
language sql stable security definer
set search_path = ''
as $$
  select btrim(b.display_name), b.accent_color, replace(encode(b.logo_png, 'base64'), chr(10), '')
  from public.surveys s
  join public.workspaces w on w.id = s.workspace_id and w.status = 'active'
  join app_private.workspace_respondent_branding b on b.workspace_id = w.id and b.is_active
  where s.slug = p_slug
    and app_private.is_survey_publicly_answerable(s.id);
$$;

create function public.get_survey_respondent_branding(p_slug text)
returns table (display_name text, accent_color text, logo_png_base64 text)
language sql stable security invoker
set search_path = ''
as $$
  select display_name, accent_color, logo_png_base64
  from app_private.get_survey_respondent_branding(p_slug);
$$;

revoke all on function app_private.get_survey_respondent_branding(text),
  public.get_survey_respondent_branding(text) from public, anon, authenticated, service_role;
grant execute on function app_private.get_survey_respondent_branding(text),
  public.get_survey_respondent_branding(text) to anon;
