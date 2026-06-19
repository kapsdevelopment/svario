import { useMutation } from '@tanstack/react-query';

import { createWorkspaceInvitation } from '../../data/workspaces/workspaceRepository';
import type { CreateWorkspaceInvitationInput } from '../../domain/workspaces/workspace';

export function useCreateWorkspaceInvitation() {
  return useMutation({
    mutationFn: (input: CreateWorkspaceInvitationInput) =>
      createWorkspaceInvitation(input),
  });
}
