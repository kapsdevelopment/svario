import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteSurveyQuestion } from '../../data/surveys/surveyRepository';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useDeleteSurveyQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSurveyQuestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
