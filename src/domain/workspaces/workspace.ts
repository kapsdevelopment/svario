export type WorkspaceType = 'business' | 'team';

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member';

export type WorkspaceMemberStatus = 'active' | 'removed';

export type WorkspaceStatus = 'active' | 'deleted';

export type SurveyVisibility = 'private' | 'workspace';

export type Workspace = {
  id: string;
  type: WorkspaceType;
  name: string;
  slug: string;
  organizationNumber: string | null;
  verifiedAt: string | null;
  status: WorkspaceStatus;
  createdByAccountId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  workspaceId: string;
  accountId: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  joinedAt: string;
};

export type WorkspaceOwner = {
  workspaceId: string;
  accountId: string;
  personalName: string | null;
  contactEmail: string | null;
};

export type WorkspaceWithMembership = Workspace & {
  myRole: WorkspaceMemberRole;
  members: WorkspaceMember[];
  owners: WorkspaceOwner[];
};

export type CreateWorkspaceInput = {
  name: string;
  type: WorkspaceType;
  organizationNumber: string | null;
};

export type SetWorkspaceOrganizationNumberInput = {
  workspaceId: string;
  organizationNumber: string;
};

export type CreateWorkspaceInvitationInput = {
  workspaceId: string;
  role: Exclude<WorkspaceMemberRole, 'owner'>;
};

export type BusinessRegistryOrganization = {
  organizationNumber: string;
  name: string;
  organizationFormCode: string | null;
  organizationFormDescription: string | null;
  municipality: string | null;
  postalPlace: string | null;
  isDeleted: boolean;
  isBankrupt: boolean;
  isUnderLiquidation: boolean;
};
