import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateQuestionVisualization } from '../../data/surveys/surveyRepository';
import type { UpdateQuestionVisualizationInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyResultsQueryKey } from './useSurveyResults';

export function useUpdateQuestionVisualization(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateQuestionVisualizationInput) =>
      updateQuestionVisualization(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyResultsQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
    },
  });
}
