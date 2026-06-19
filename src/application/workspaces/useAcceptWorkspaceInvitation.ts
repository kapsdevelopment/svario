import { useMutation, useQueryClient } from '@tanstack/react-query';

import { acceptWorkspaceInvitation } from '../../data/workspaces/workspaceRepository';
import { surveyListQueryKey } from '../surveys/useSurveyList';
import { workspacesQueryKey } from './useWorkspaces';

export function useAcceptWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptWorkspaceInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
