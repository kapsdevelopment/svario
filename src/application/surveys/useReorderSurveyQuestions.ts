import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reorderSurveyQuestions } from '../../data/surveys/surveyRepository';
import type { ReorderSurveyQuestionsInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useReorderSurveyQuestions(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderSurveyQuestionsInput) =>
      reorderSurveyQuestions(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: surveyEditorQueryKey(surveyId),
        }),
        queryClient.invalidateQueries({ queryKey: surveyListQueryKey }),
      ]);
    },
  });
}
