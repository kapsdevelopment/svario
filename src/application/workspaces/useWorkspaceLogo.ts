import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMyWorkspaceBranding, replaceWorkspaceLogo } from '../../data/workspaces/respondentBrandingRepository';
import { respondentBrandingQueryKey } from './useRespondentBranding';

const profileKey = (accountId: string, workspaceId: string) => ['workspaceLogo', accountId, workspaceId] as const;

export function useWorkspaceLogo(accountId: string, workspaceId: string) {
  return useQuery({
    queryKey: profileKey(accountId, workspaceId),
    queryFn: () => getMyWorkspaceBranding(workspaceId),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useReplaceWorkspaceLogo(accountId: string, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { revision: number; logo: File }) => replaceWorkspaceLogo({ ...input, workspaceId }),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKey(accountId, workspaceId) }),
      queryClient.invalidateQueries({ queryKey: ['workspaceBrandingAdmin', accountId, 'profile', workspaceId] }),
      queryClient.resetQueries({ queryKey: respondentBrandingQueryKey }),
    ]),
    onError: (error) => {
      if ('code' in error && error.code === '42501') {
        void queryClient.invalidateQueries({ queryKey: profileKey(accountId, workspaceId) });
        void queryClient.invalidateQueries({ queryKey: ['brandingAccess', accountId, workspaceId] });
      }
    },
  });
}
