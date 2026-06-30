import { useMutation, useQueryClient } from '@tanstack/react-query';

import { moveSurveyQuestion } from '../../data/surveys/surveyRepository';
import type { MoveSurveyQuestionInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useMoveSurveyQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveSurveyQuestionInput) => moveSurveyQuestion(input),
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
