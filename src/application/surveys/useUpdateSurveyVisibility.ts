import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSurveyVisibility } from '../../data/surveys/surveyRepository';
import type { UpdateSurveyVisibilityInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useUpdateSurveyVisibility(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSurveyVisibilityInput) =>
      updateSurveyVisibility(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
