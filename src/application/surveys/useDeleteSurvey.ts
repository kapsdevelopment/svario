import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteSurvey } from '../../data/surveys/surveyRepository';
import { surveyListQueryKey } from './useSurveyList';

export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
