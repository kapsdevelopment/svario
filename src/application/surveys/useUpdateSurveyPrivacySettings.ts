import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSurveyPrivacySettings } from '../../data/surveys/surveyRepository';
import type { UpsertSurveyPrivacySettingsInput } from '../../domain/surveys/survey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyRetentionWarningsQueryKey } from './useSurveyRetentionWarnings';

export function useUpdateSurveyPrivacySettings(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSurveyPrivacySettingsInput) =>
      updateSurveyPrivacySettings(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: surveyEditorQueryKey(surveyId),
        }),
        queryClient.invalidateQueries({
          queryKey: surveyRetentionWarningsQueryKey,
        }),
      ]),
  });
}
