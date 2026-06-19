import type {
  CreateWorkspaceInput,
  CreateWorkspaceInvitationInput,
  Workspace,
  WorkspaceMember,
  WorkspaceWithMembership,
} from '../../domain/workspaces/workspace';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/database.types';

type WorkspaceRow = Pick<
  Tables<'workspaces'>,
  | 'created_at'
  | 'created_by_account_id'
  | 'id'
  | 'name'
  | 'organization_number'
  | 'slug'
  | 'status'
  | 'type'
  | 'updated_at'
>;

type WorkspaceMemberRow = Pick<
  Tables<'workspace_members'>,
  'account_id' | 'joined_at' | 'role' | 'status' | 'workspace_id'
>;

const workspaceSelect =
  'id, type, name, slug, organization_number, status, created_by_account_id, created_at, updated_at';
const workspaceMemberSelect =
  'workspace_id, account_id, role, status, joined_at';

export async function listMyWorkspaces(
  accountId: string,
): Promise<WorkspaceWithMembership[]> {
  const client = requireWorkspaceClient();
  const { data: workspaces, error: workspaceError } = await client
    .from('workspaces')
    .select(workspaceSelect)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (workspaceError) {
    throw workspaceError;
  }

  const workspaceIds = (workspaces ?? []).map((workspace) => workspace.id);

  if (workspaceIds.length === 0) {
    return [];
  }

  const { data: members, error: memberError } = await client
    .from('workspace_members')
    .select(workspaceMemberSelect)
    .in('workspace_id', workspaceIds)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (memberError) {
    throw memberError;
  }

  const membersByWorkspace = new Map<string, WorkspaceMember[]>();

  for (const member of members ?? []) {
    const mappedMember = mapWorkspaceMember(member);
    const workspaceMembers =
      membersByWorkspace.get(mappedMember.workspaceId) ?? [];
    workspaceMembers.push(mappedMember);
    membersByWorkspace.set(mappedMember.workspaceId, workspaceMembers);
  }

  return (workspaces ?? []).map((workspace) => {
    const workspaceMembers = membersByWorkspace.get(workspace.id) ?? [];
    const myMembership = workspaceMembers.find(
      (member) => member.accountId === accountId,
    );

    return {
      ...mapWorkspace(workspace),
      myRole: myMembership?.role ?? 'member',
      members: workspaceMembers,
    };
  });
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<string> {
  const client = requireWorkspaceClient();
  const { data, error } = await client.rpc('create_workspace', {
    p_name: input.name,
    p_type: input.type,
    p_organization_number: input.organizationNumber,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createWorkspaceInvitation(
  input: CreateWorkspaceInvitationInput,
): Promise<string> {
  const client = requireWorkspaceClient();
  const { data, error } = await client.rpc('create_workspace_invitation', {
    p_workspace_id: input.workspaceId,
    p_role: input.role,
    p_expires_in_days: 14,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function acceptWorkspaceInvitation(token: string): Promise<string> {
  const client = requireWorkspaceClient();
  const { data, error } = await client.rpc('accept_workspace_invitation', {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  accountId: string;
}): Promise<void> {
  const client = requireWorkspaceClient();
  const { error } = await client.rpc('remove_workspace_member', {
    p_workspace_id: input.workspaceId,
    p_account_id: input.accountId,
  });

  if (error) {
    throw error;
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const client = requireWorkspaceClient();
  const { error } = await client.rpc('delete_workspace', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    throw error;
  }
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    organizationNumber: row.organization_number,
    status: row.status,
    createdByAccountId: row.created_by_account_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkspaceMember(row: WorkspaceMemberRow): WorkspaceMember {
  return {
    workspaceId: row.workspace_id,
    accountId: row.account_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

function requireWorkspaceClient() {
  if (!supabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return supabase;
}
