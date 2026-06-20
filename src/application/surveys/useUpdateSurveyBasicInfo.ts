import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSurveyBasicInfo } from '../../data/surveys/surveyRepository';
import type { UpdateSurveyBasicInfoInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function useUpdateSurveyBasicInfo(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSurveyBasicInfoInput) =>
      updateSurveyBasicInfo(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      });
      void queryClient.invalidateQueries({ queryKey: surveyListQueryKey });
    },
  });
}
