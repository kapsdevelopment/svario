import { useMutation, useQueryClient } from '@tanstack/react-query';

import { publishSurvey } from '../../data/surveys/surveyRepository';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function usePublishSurvey(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => publishSurvey(surveyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
