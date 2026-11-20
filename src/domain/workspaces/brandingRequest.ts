export type BrandingRequestStatus = 'new' | 'in_review' | 'approved' | 'closed';

export type BrandingAccess = {
  isAllowed: boolean;
  requestStatus: BrandingRequestStatus | null;
  requestedAt: string | null;
};

export type BrandingRequest = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  organizationNumber: string | null;
  contactName: string;
  contactEmail: string;
  message: string;
  status: BrandingRequestStatus;
  requestedAt: string;
  revision: number;
};

export const brandingRequestStatusLabel: Record<BrandingRequestStatus, string> = {
  new: 'Ny', in_review: 'Under behandling', approved: 'Godkjent', closed: 'Avsluttet',
};
