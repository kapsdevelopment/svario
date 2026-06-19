import { useMutation, useQueryClient } from '@tanstack/react-query';

import { repeatSurveyOnce } from '../../data/surveys/surveyRepository';
import { surveyListQueryKey } from './useSurveyList';

export function useRepeatSurveyOnce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: repeatSurveyOnce,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
