import type {
  LiveSurveyHostState,
  LiveSurveyParticipantState,
  LiveSurveySummary,
} from '../../domain/live/liveSurvey';
import { publicSupabase, supabase } from '../supabase/client';

function getClient(publicAccess = false) {
  const client = publicAccess ? publicSupabase : supabase;
  if (!client) {
    throw new Error('Supabase er ikke konfigurert.');
  }
  return client;
}

export async function startLiveSurvey(surveyId: string) {
  const { data, error } = await getClient().rpc('start_live_survey', { p_survey_id: surveyId });
  if (error) throw error;
  return data;
}

export async function listLiveSurveySessions(surveyId: string) {
  const { data, error } = await getClient().rpc('list_live_survey_sessions', { p_survey_id: surveyId });
  if (error) throw error;
  return data as unknown as LiveSurveySummary[];
}

export async function getLiveSurveyHost(sessionId: string) {
  const { data, error } = await getClient().rpc('get_live_survey_host', { p_session_id: sessionId });
  if (error) throw error;
  return data as unknown as LiveSurveyHostState | null;
}

export async function advanceLiveSurvey(sessionId: string, step: number, finish: boolean) {
  const { data, error } = await getClient().rpc('advance_live_survey', {
    p_session_id: sessionId,
    p_step: step,
    p_finish: finish,
  });
  if (error) throw error;
  return data as unknown as LiveSurveyHostState;
}

export async function getLiveSurveyStatus(sessionId: string, voterKey: string) {
  const { data, error } = await getClient(true).rpc('get_live_survey_status', {
    p_session_id: sessionId,
    p_voter_key: voterKey,
  });
  if (error) throw error;
  return data as unknown as LiveSurveyParticipantState | null;
}

export async function submitLiveSurveyVote(
  sessionId: string,
  voterKey: string,
  step: number,
  questionId: string,
  optionId: string,
) {
  const { data, error } = await getClient(true).rpc('submit_live_survey_vote', {
    p_session_id: sessionId,
    p_voter_key: voterKey,
    p_step: step,
    p_question_id: questionId,
    p_option_id: optionId,
  });
  if (error) throw error;
  return data;
}
