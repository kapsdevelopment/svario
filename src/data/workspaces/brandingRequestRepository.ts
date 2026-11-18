import type { BrandingAccess, BrandingRequest, BrandingRequestStatus } from '../../domain/workspaces/brandingRequest';
import { supabase } from '../supabase/client';

function client() {
  if (!supabase) throw new Error('Supabase er ikke konfigurert.');
  return supabase;
}

export async function getBrandingAccess(workspaceId: string): Promise<BrandingAccess> {
  const { data, error } = await client().rpc('get_my_branding_access', { p_workspace_id: workspaceId }).single();
  if (error) throw error;
  return { isAllowed: data.is_allowed, requestStatus: data.request_status as BrandingRequestStatus | null, requestedAt: data.requested_at };
}

export async function requestBranding(input: { workspaceId: string; contactName: string; contactEmail: string; message: string }) {
  const { data, error } = await client().rpc('request_workspace_branding', {
    p_workspace_id: input.workspaceId, p_contact_name: input.contactName.trim(),
    p_contact_email: input.contactEmail.trim(), p_message: input.message.trim(),
  });
  if (error) throw error;
  return data;
}

export async function countNewBrandingRequests(): Promise<number> {
  const { data, error } = await client().rpc('count_new_branding_requests');
  if (error) throw error;
  return data;
}

export async function listBrandingRequests(status: BrandingRequestStatus | null, offset: number): Promise<BrandingRequest[]> {
  const { data, error } = await client().rpc('list_workspace_branding_requests', { p_status: status, p_offset: offset });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id, workspaceId: row.workspace_id, workspaceName: row.workspace_name,
    organizationNumber: row.organization_number, contactName: row.contact_name, contactEmail: row.contact_email,
    message: row.message, status: row.status as BrandingRequestStatus, requestedAt: row.requested_at, revision: row.revision,
  }));
}

export async function reviewBrandingRequest(input: { requestId: string; revision: number; status: Exclude<BrandingRequestStatus, 'new'> }) {
  const { error } = await client().rpc('review_workspace_branding_request', {
    p_request_id: input.requestId, p_expected_revision: input.revision, p_status: input.status,
  });
  if (error) throw error;
}
