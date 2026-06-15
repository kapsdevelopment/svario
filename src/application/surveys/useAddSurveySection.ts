import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addSurveySection } from '../../data/surveys/surveyRepository';
import type { AddSurveySectionInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useAddSurveySection(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddSurveySectionInput) => addSurveySection(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
