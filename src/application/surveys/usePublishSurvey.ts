import { useMutation, useQueryClient } from '@tanstack/react-query';

import { publishSurvey } from '../../data/surveys/surveyRepository';
import { publishedSurveyQueryKey } from './usePublishedSurvey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';

export function usePublishSurvey(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => publishSurvey(surveyId),
    onSuccess: async (survey) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: surveyEditorQueryKey(surveyId) }),
        queryClient.invalidateQueries({ queryKey: surveyListQueryKey }),
        queryClient.invalidateQueries({ queryKey: publishedSurveyQueryKey(survey.slug) }),
      ]);
    },
  });
}
