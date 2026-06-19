import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createWorkspace } from '../../data/workspaces/workspaceRepository';
import type { CreateWorkspaceInput } from '../../domain/workspaces/workspace';
import { workspacesQueryKey } from './useWorkspaces';

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => createWorkspace(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
