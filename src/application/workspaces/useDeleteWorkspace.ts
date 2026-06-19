import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteWorkspace } from '../../data/workspaces/workspaceRepository';
import { surveyListQueryKey } from '../surveys/useSurveyList';
import { workspacesQueryKey } from './useWorkspaces';

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
