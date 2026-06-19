import { useQuery } from '@tanstack/react-query';

import { listMyWorkspaces } from '../../data/workspaces/workspaceRepository';

export const workspacesQueryKey = ['workspaces'] as const;

export function useWorkspaces(accountId: string | null | undefined) {
  return useQuery({
    enabled: Boolean(accountId),
    queryKey: workspacesQueryKey,
    queryFn: () => listMyWorkspaces(accountId!),
  });
}
