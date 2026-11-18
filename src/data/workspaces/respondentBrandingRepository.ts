import type { RespondentBranding, Workspace, WorkspaceRespondentBranding } from '../../domain/workspaces/workspace';
import { publicSupabase, supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';

type RespondentBrandingRow = Database['public']['Functions']['get_survey_respondent_branding']['Returns'][number];

export async function getRespondentBranding(slug: string): Promise<RespondentBranding | null> {
  if (!publicSupabase) {
    return null;
  }

  const { data, error } = await publicSupabase
    .rpc('get_survey_respondent_branding', { p_slug: slug })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapBranding(data) : null;
}

export async function getSvarioAdminAccess(): Promise<boolean> {
  const { data, error } = await requireBrandingAdminClient().rpc('is_svario_admin');
  if (error) throw error;
  return data;
}

export async function listBrandingWorkspaces(search: string): Promise<Pick<Workspace, 'id' | 'name' | 'slug'>[]> {
  const { data, error } = await requireBrandingAdminClient().rpc('list_branding_workspaces', { p_search: search });
  if (error) throw error;
  return data;
}

export async function getWorkspaceRespondentBranding(workspaceId: string): Promise<WorkspaceRespondentBranding | null> {
  const { data, error } = await requireBrandingAdminClient()
    .rpc('get_workspace_branding_editor', { p_workspace_id: workspaceId })
    .maybeSingle();
  if (error) throw error;
  return data ? { ...mapBranding(data), isActive: data.is_active, revision: data.revision } : null;
}

export async function saveWorkspaceBranding(input: {
  workspaceId: string;
  displayName: string;
  accentColor: string;
  revision: number;
  logo: File | null;
}): Promise<void> {
  const body = new FormData();
  body.set('workspaceId', input.workspaceId);
  body.set('displayName', input.displayName);
  body.set('accentColor', input.accentColor);
  body.set('revision', String(input.revision));
  if (input.logo) body.set('logo', input.logo);
  await submitBranding(body);
}

export async function getMyWorkspaceBranding(workspaceId: string): Promise<WorkspaceRespondentBranding | null> {
  const { data, error } = await requireBrandingAdminClient()
    .rpc('get_my_workspace_branding', { p_workspace_id: workspaceId })
    .maybeSingle();
  if (error) throw error;
  return data ? { ...mapBranding(data), isActive: data.is_active, revision: data.revision } : null;
}

export async function replaceWorkspaceLogo(input: { workspaceId: string; revision: number; logo: File }): Promise<void> {
  const body = new FormData();
  body.set('action', 'logo');
  body.set('workspaceId', input.workspaceId);
  body.set('revision', String(input.revision));
  body.set('logo', input.logo);
  await submitBranding(body);
}

async function submitBranding(body: FormData): Promise<void> {
  const { error } = await requireBrandingAdminClient().functions.invoke('save-workspace-branding', { body });
  if (error) {
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      throw Object.assign(new Error(response?.message ?? 'Kunne ikke lagre profilen.'), { code: response?.code });
    }
    throw error;
  }
}

export async function setWorkspaceRespondentBrandingActive(workspaceId: string, isActive: boolean): Promise<boolean> {
  const { data, error } = await requireBrandingAdminClient().rpc('set_workspace_respondent_branding_active', {
    p_workspace_id: workspaceId,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data;
}

function mapBranding(data: RespondentBrandingRow): RespondentBranding {
  return {
    displayName: data.display_name,
    accentColor: data.accent_color,
    logoSrc: `data:image/png;base64,${data.logo_png_base64}`,
  };
}

function requireBrandingAdminClient() {
  if (!supabase) throw new Error('Supabase er ikke konfigurert.');
  return supabase;
}
