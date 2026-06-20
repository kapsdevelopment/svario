import { useQuery } from '@tanstack/react-query';

import { listSurveyRetentionWarnings } from '../../data/surveys/surveyRepository';

export const surveyRetentionWarningsQueryKey = [
  'surveys',
  'retention-warnings',
] as const;

export function useSurveyRetentionWarnings(surveyIds: string[]) {
  return useQuery({
    queryKey: [...surveyRetentionWarningsQueryKey, surveyIds] as const,
    queryFn: () => listSurveyRetentionWarnings(surveyIds),
    enabled: surveyIds.length > 0,
  });
}
