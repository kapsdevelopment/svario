import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getSvarioAdminAccess,
  getWorkspaceRespondentBranding,
  listBrandingWorkspaces,
  saveWorkspaceBranding,
  setWorkspaceRespondentBrandingActive,
} from '../../data/workspaces/respondentBrandingRepository';
import { useAuth } from '../auth/AuthProvider';
import { respondentBrandingQueryKey } from './useRespondentBranding';

const adminAccessKey = (accountId: string) => ['svarioAdminAccess', accountId] as const;
const profileKey = (accountId: string, workspaceId: string) =>
  ['workspaceBrandingAdmin', accountId, 'profile', workspaceId] as const;

const adminQueryOptions = { retry: false, gcTime: 0 } as const;

export function useSvarioAdminAccess(enabled = true) {
  const auth = useAuth();

  return useQuery({
    ...adminQueryOptions,
    queryKey: adminAccessKey(auth.account?.id ?? ''),
    queryFn: getSvarioAdminAccess,
    enabled: enabled && auth.isAdminReady,
  });
}

export function useBrandingWorkspaces(accountId: string, search: string) {
  const term = search.trim();

  return useQuery({
    ...adminQueryOptions,
    queryKey: ['workspaceBrandingAdmin', accountId, 'workspaces', term],
    queryFn: () => listBrandingWorkspaces(term),
  });
}

export function useWorkspaceBrandingProfile(accountId: string, workspaceId: string) {
  return useQuery({
    ...adminQueryOptions,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryKey: profileKey(accountId, workspaceId),
    queryFn: () => getWorkspaceRespondentBranding(workspaceId),
  });
}

export function useSetWorkspaceBrandingActive(accountId: string, workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isActive: boolean) => setWorkspaceRespondentBrandingActive(workspaceId, isActive),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKey(accountId, workspaceId) }),
      queryClient.resetQueries({ queryKey: respondentBrandingQueryKey }),
    ]),
    onError: (error) => {
      if ('code' in error && error.code === '42501') {
        queryClient.setQueryData(adminAccessKey(accountId), false);
      }
    },
  });
}

export function useSaveWorkspaceBranding(accountId: string, workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof saveWorkspaceBranding>[0], 'workspaceId'>) =>
      saveWorkspaceBranding({ ...input, workspaceId }),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKey(accountId, workspaceId) }),
      queryClient.resetQueries({ queryKey: respondentBrandingQueryKey }),
    ]),
    onError: (error) => {
      if ('code' in error && error.code === '42501') {
        queryClient.setQueryData(adminAccessKey(accountId), false);
      }
    },
  });
}
