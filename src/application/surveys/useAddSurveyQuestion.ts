import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addSurveyQuestion } from '../../data/surveys/surveyRepository';
import type { AddSurveyQuestionInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useAddSurveyQuestion(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddSurveyQuestionInput) => addSurveyQuestion(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
