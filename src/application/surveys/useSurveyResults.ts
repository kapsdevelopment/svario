import { useQuery } from '@tanstack/react-query';

import { getSurveyResults } from '../../data/surveys/surveyRepository';

export const surveyResultsQueryKey = (surveyId: string) =>
  ['surveys', 'results', surveyId] as const;

export function useSurveyResults(surveyId: string | undefined) {
  return useQuery({
    queryKey: surveyResultsQueryKey(surveyId ?? ''),
    queryFn: () => {
      if (!surveyId) {
        throw new Error('Mangler skjema-id.');
      }

      return getSurveyResults(surveyId);
    },
    enabled: Boolean(surveyId),
  });
}
