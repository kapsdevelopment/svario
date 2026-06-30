import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setWorkspaceOrganizationNumber } from '../../data/workspaces/workspaceRepository';
import type { SetWorkspaceOrganizationNumberInput } from '../../domain/workspaces/workspace';
import { workspacesQueryKey } from './useWorkspaces';

export function useSetWorkspaceOrganizationNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetWorkspaceOrganizationNumberInput) =>
      setWorkspaceOrganizationNumber(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey }),
  });
}
