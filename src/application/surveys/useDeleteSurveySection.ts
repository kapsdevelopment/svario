import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteSurveySection } from '../../data/surveys/surveyRepository';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useDeleteSurveySection(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSurveySection,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
