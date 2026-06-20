create or replace function app_private.create_survey_draft(
  p_workspace_id uuid default null,
  p_visibility public.survey_visibility default 'private',
  p_title text default null,
  p_description text default null,
  p_slug text default null,
  p_response_mode public.survey_response_mode default 'anonymous',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns public.surveys
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_account_id uuid := app_private.current_account_id();
  v_survey public.surveys%rowtype;
begin
  if v_account_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'Skjemaet må ha en tittel.';
  end if;

  if p_slug is null or length(btrim(p_slug)) = 0 then
    raise exception 'Skjemaet mangler lenke.';
  end if;

  if p_ends_at is not null
     and p_starts_at is not null
     and p_ends_at <= p_starts_at then
    raise exception 'Slutttidspunkt må være etter starttidspunkt.';
  end if;

  if not app_private.can_create_survey(
    v_account_id,
    p_workspace_id,
    p_visibility
  ) then
    raise exception 'Du har ikke tilgang til å opprette skjema her.';
  end if;

  insert into public.surveys (
    owner_account_id,
    workspace_id,
    visibility,
    title,
    description,
    slug,
    status,
    response_mode,
    starts_at,
    ends_at
  )
  values (
    v_account_id,
    p_workspace_id,
    p_visibility,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    lower(btrim(p_slug)),
    'draft',
    p_response_mode,
    p_starts_at,
    p_ends_at
  )
  returning * into v_survey;

  return v_survey;
end;
$$;

create or replace function public.create_survey_draft(
  p_workspace_id uuid default null,
  p_visibility public.survey_visibility default 'private',
  p_title text default null,
  p_description text default null,
  p_slug text default null,
  p_response_mode public.survey_response_mode default 'anonymous',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_survey_draft(
    p_workspace_id,
    p_visibility,
    p_title,
    p_description,
    p_slug,
    p_response_mode,
    p_starts_at,
    p_ends_at
  );
$$;

revoke all on function app_private.create_survey_draft(
  uuid,
  public.survey_visibility,
  text,
  text,
  text,
  public.survey_response_mode,
  timestamptz,
  timestamptz
) from public;

revoke all on function public.create_survey_draft(
  uuid,
  public.survey_visibility,
  text,
  text,
  text,
  public.survey_response_mode,
  timestamptz,
  timestamptz
) from public;

grant execute on function app_private.create_survey_draft(
  uuid,
  public.survey_visibility,
  text,
  text,
  text,
  public.survey_response_mode,
  timestamptz,
  timestamptz
) to authenticated, service_role;

grant execute on function public.create_survey_draft(
  uuid,
  public.survey_visibility,
  text,
  text,
  text,
  public.survey_response_mode,
  timestamptz,
  timestamptz
) to authenticated, service_role;
