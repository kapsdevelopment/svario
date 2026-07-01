import { useQuery } from '@tanstack/react-query';

import { listMySurveys } from '../../data/surveys/surveyRepository';
import { useWorkspaceScope } from '../workspaces/WorkspaceScopeProvider';

export const surveyListQueryKey = ['surveys', 'mine'] as const;

export function useSurveyList() {
  const { workspaceId } = useWorkspaceScope();

  return useQuery({
    queryKey: [...surveyListQueryKey, workspaceId ?? 'personal'],
    queryFn: () => listMySurveys({ workspaceId }),
  });
}
