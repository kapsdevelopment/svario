import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { countNewBrandingRequests, getBrandingAccess, listBrandingRequests, requestBranding, reviewBrandingRequest } from '../../data/workspaces/brandingRequestRepository';
import type { BrandingRequestStatus } from '../../domain/workspaces/brandingRequest';
import { useAuth } from '../auth/AuthProvider';

const options = { retry: false, gcTime: 0 } as const;
const accessKey = (accountId: string, workspaceId: string) => ['brandingAccess', accountId, workspaceId] as const;
const inboxKey = (accountId: string) => ['brandingInbox', accountId] as const;

export function useBrandingAccess(accountId: string, workspaceId: string) {
  return useQuery({ ...options, queryKey: accessKey(accountId, workspaceId), queryFn: () => getBrandingAccess(workspaceId), refetchInterval: 30_000 });
}

export function useRequestBranding(accountId: string, workspaceId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof requestBranding>[0], 'workspaceId'>) => requestBranding({ ...input, workspaceId }),
    onSettled: () => cache.invalidateQueries({ queryKey: accessKey(accountId, workspaceId) }),
  });
}

export function useBrandingRequestCount(enabled: boolean) {
  const { account } = useAuth();
  return useQuery({
    ...options, queryKey: [...inboxKey(account?.id ?? ''), 'count'], queryFn: countNewBrandingRequests,
    enabled: enabled && Boolean(account), refetchInterval: 30_000,
  });
}

export function useBrandingInbox(accountId: string, status: BrandingRequestStatus | null, offset: number) {
  return useQuery({
    ...options, queryKey: [...inboxKey(accountId), 'requests', status, offset],
    queryFn: () => listBrandingRequests(status, offset), refetchInterval: 30_000,
  });
}

export function useReviewBrandingRequest(accountId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: reviewBrandingRequest,
    onSettled: () => Promise.all([
      cache.invalidateQueries({ queryKey: inboxKey(accountId) }),
      cache.invalidateQueries({ queryKey: ['brandingAccess'] }),
    ]),
  });
}
