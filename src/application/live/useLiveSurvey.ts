import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  advanceLiveSurvey,
  getLiveSurveyHost,
  getLiveSurveyStatus,
  listLiveSurveySessions,
  startLiveSurvey,
  submitLiveSurveyVote,
} from '../../data/live/liveSurveyRepository';
import { useAuth } from '../auth/AuthProvider';

const pollInterval = 2000;
const hostKey = (sessionId: string, accountId: string | undefined) =>
  ['live', 'host', sessionId, accountId] as const;
const sessionsKey = (surveyId: string, accountId: string | undefined) =>
  ['live', 'sessions', surveyId, accountId] as const;
const participantKey = (sessionId: string, voterKey: string) =>
  ['live', 'participant', sessionId, voterKey] as const;

export function useLiveSurveySessions(surveyId: string) {
  const { account } = useAuth();
  return useQuery({
    queryKey: sessionsKey(surveyId, account?.id),
    queryFn: () => listLiveSurveySessions(surveyId),
  });
}

export function useStartLiveSurvey(surveyId: string) {
  const { account } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => startLiveSurvey(surveyId),
    onSuccess: () => { void client.invalidateQueries({ queryKey: sessionsKey(surveyId, account?.id) }); },
  });
}

export function useLiveSurveyHost(sessionId: string) {
  const { account } = useAuth();
  return useQuery({
    queryKey: hostKey(sessionId, account?.id),
    queryFn: () => getLiveSurveyHost(sessionId),
    refetchInterval: (query) => {
      const session = query.state.data;
      if (session === null || session?.status === 'closed') return false;
      return pollInterval;
    },
  });
}

export function useAdvanceLiveSurvey(sessionId: string) {
  const { account } = useAuth();
  const client = useQueryClient();
  const queryKey = hostKey(sessionId, account?.id);
  return useMutation({
    mutationFn: ({ step, finish }: { step: number; finish: boolean }) =>
      advanceLiveSurvey(sessionId, step, finish),
    onSuccess: async (session) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, session);
      void client.invalidateQueries({ queryKey: sessionsKey(session.surveyId, account?.id) });
    },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
}

export function useLiveSurveyParticipant(sessionId: string, voterKey: string) {
  return useQuery({
    queryKey: participantKey(sessionId, voterKey),
    queryFn: () => getLiveSurveyStatus(sessionId, voterKey),
    refetchInterval: (query) => {
      const session = query.state.data;
      if (session === null || session?.status === 'closed') return false;
      return pollInterval;
    },
  });
}

export function useSubmitLiveSurveyVote(sessionId: string, voterKey: string, step: number, questionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => submitLiveSurveyVote(sessionId, voterKey, step, questionId, optionId),
    onSettled: () => { void client.invalidateQueries({ queryKey: participantKey(sessionId, voterKey) }); },
  });
}
