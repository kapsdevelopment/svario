import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getSurveyResults } from '../../data/surveys/surveyRepository';

export const surveyResultsQueryKey = (surveyId: string) =>
  ['surveys', 'results', surveyId] as const;

type UseSurveyResultsOptions = {
  live?: boolean;
  pollIntervalMs?: number;
};

const defaultLivePollIntervalMs = 4000;

export function useSurveyResults(
  surveyId: string | undefined,
  options: UseSurveyResultsOptions = {},
) {
  const [isLivePaused, setIsLivePaused] = useState(false);
  const livePollIntervalMs = options.pollIntervalMs ?? defaultLivePollIntervalMs;
  const shouldPoll = Boolean(options.live && surveyId && !isLivePaused);

  useEffect(() => {
    setIsLivePaused(false);
  }, [surveyId]);

  const query = useQuery({
    queryKey: surveyResultsQueryKey(surveyId ?? ''),
    queryFn: () => {
      if (!surveyId) {
        throw new Error('Mangler skjema-id.');
      }

      return getSurveyResults(surveyId);
    },
    enabled: Boolean(surveyId),
    refetchInterval: shouldPoll ? livePollIntervalMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: options.live ? shouldPoll : true,
  });

  return {
    ...query,
    live: {
      enabled: Boolean(options.live && surveyId),
      isPaused: isLivePaused,
      isRefreshing: query.isFetching && !query.isLoading,
      lastUpdatedAt: query.dataUpdatedAt > 0 ? query.dataUpdatedAt : null,
      pollIntervalMs: livePollIntervalMs,
      refresh: query.refetch,
      setPaused: setIsLivePaused,
    },
  };
}
