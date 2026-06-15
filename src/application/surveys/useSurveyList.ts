import { useQuery } from '@tanstack/react-query';

import { listMySurveys } from '../../data/surveys/surveyRepository';

export const surveyListQueryKey = ['surveys', 'mine'] as const;

export function useSurveyList() {
  return useQuery({
    queryKey: surveyListQueryKey,
    queryFn: listMySurveys,
  });
}
