import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listSurveyPublicationActions, stopSurveyPublication } from '../../data/surveys/surveyRepository';
import type { SurveyPublicationAction, SurveySummary } from '../../domain/surveys/survey';
import { useAuth } from '../auth/AuthProvider';
import { publishedSurveyQueryKey } from './usePublishedSurvey';
import { surveyEditorQueryKey } from './useSurveyEditor';
import { surveyListQueryKey } from './useSurveyList';
import { surveyResultsQueryKey } from './useSurveyResults';

export const surveyPublicationQueryKey = ['surveys', 'publication-actions'] as const;

type PublicationSurvey = Pick<SurveySummary, 'id' | 'slug'>;

export function useSurveyPublicationActions(surveyIds: string[]) {
  const { account } = useAuth();
  const ids = [...surveyIds].sort();

  return useQuery({
    queryKey: [...surveyPublicationQueryKey, account?.id, ids],
    queryFn: () => listSurveyPublicationActions(ids),
    enabled: Boolean(account && ids.length > 0),
    refetchInterval: 5000,
  });
}

export function useStopSurveyPublication() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ survey, action }: { survey: PublicationSurvey; action: SurveyPublicationAction }) =>
      stopSurveyPublication(survey.id, action),
    onSettled: async (_data, error, { survey }) => {
      const refresh = [client.invalidateQueries({ queryKey: surveyPublicationQueryKey })];
      if (!error) {
        refresh.push(
          client.invalidateQueries({ queryKey: surveyListQueryKey }),
          client.invalidateQueries({ queryKey: surveyEditorQueryKey(survey.id) }),
          client.invalidateQueries({ queryKey: surveyResultsQueryKey(survey.id) }),
          client.invalidateQueries({ queryKey: publishedSurveyQueryKey(survey.slug) }),
        );
      }
      await Promise.all(refresh);
    },
  });
}
