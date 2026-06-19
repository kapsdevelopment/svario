import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeWorkspaceMember } from '../../data/workspaces/workspaceRepository';
import { workspacesQueryKey } from './useWorkspaces';

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeWorkspaceMember,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
