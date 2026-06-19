import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSurveyPrivacySettings } from '../../data/surveys/surveyRepository';
import type { UpsertSurveyPrivacySettingsInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';

export function useUpdateSurveyPrivacySettings(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSurveyPrivacySettingsInput) =>
      updateSurveyPrivacySettings(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: surveyEditorQueryKey(surveyId),
      }),
  });
}
