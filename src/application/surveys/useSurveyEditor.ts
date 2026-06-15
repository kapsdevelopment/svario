import { useQuery } from '@tanstack/react-query';

import { getSurveyEditor } from '../../data/surveys/surveyRepository';

export const surveyEditorQueryKey = (surveyId: string) =>
  ['surveys', 'editor', surveyId] as const;

export function useSurveyEditor(surveyId: string | undefined) {
  return useQuery({
    queryKey: surveyEditorQueryKey(surveyId ?? ''),
    queryFn: () => {
      if (!surveyId) {
        throw new Error('Mangler skjema-id.');
      }

      return getSurveyEditor(surveyId);
    },
    enabled: Boolean(surveyId),
  });
}
