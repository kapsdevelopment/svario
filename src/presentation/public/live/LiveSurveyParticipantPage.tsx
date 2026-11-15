import { CheckCircle2, ListChecks } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useLiveSurveyParticipant, useSubmitLiveSurveyVote } from '../../../application/live/useLiveSurvey';
import { isLiveSurveyId, type LiveSurveyQuestion } from '../../../domain/live/liveSurvey';
import { getLiveSurveyVoterKey } from '../../../infrastructure/config/liveSurveyVoterKey';
import { Panel } from '../../shared/components/Panel';
import { RespondentPrivacyNotice } from '../respondent/RespondentPrivacyNotice';
import { SurveyChoiceList } from '../respondent/SurveyChoiceList';

export function LiveSurveyParticipantPage() {
  const { sessionId } = useParams();

  return (
    <main className="respondent-page image-page image-page--fjord">
      <div className="respondent-card">
        <p className="eyebrow">Svario · Liveøkt</p>
        {isLiveSurveyId(sessionId) ? (
          <LiveSurveyParticipant key={sessionId} sessionId={sessionId} />
        ) : (
          <Panel title="Fant ikke liveøkten" subtitle="Skann QR-koden på nytt." />
        )}
      </div>
    </main>
  );
}

function LiveSurveyParticipant({ sessionId }: { sessionId: string }) {
  const [voterKey] = useState(() => getLiveSurveyVoterKey(sessionId));
  const state = useLiveSurveyParticipant(sessionId, voterKey);

  if (state.isPending) {
    return (
      <Panel
        title="Kobler til liveøkten"
        subtitle={state.fetchStatus === 'paused' ? 'Venter på nett …' : 'Henter økten …'}
      />
    );
  }
  if (!state.data) {
    return state.isError ? (
      <Panel title="Kunne ikke koble til" subtitle="Sjekk at mobilen er på nett.">
        <button className="button button--secondary" onClick={() => void state.refetch()} type="button">
          Prøv igjen
        </button>
      </Panel>
    ) : <Panel title="Liveøkten er ikke tilgjengelig" subtitle="Be verten om riktig lenke." />;
  }

  const { privacy, question, questionCount, selectedOptionId, status, step, title } = state.data;
  const isOffline = state.isRefetchError || state.fetchStatus === 'paused';
  const prompt = status === 'question' && question ? question.prompt : '';
  return (
    <Panel title={title} subtitle="Du svarer anonymt">
      <p className="sr-only" aria-live="polite">
        {prompt ? `Spørsmål ${step + 1} av ${questionCount}. ${prompt}` : ''}
      </p>
      {isOffline ? (
        <div className="form-alert" role="status">Mistet forbindelsen. Vi oppdaterer når du er på nett igjen.</div>
      ) : null}
      {status === 'lobby' ? (
        <div className="empty-state" role="status">
          Du er med! Det første spørsmålet vises her når verten starter.
        </div>
      ) : null}
      {status === 'question' && question ? (
        <LiveVoteForm
          key={step}
          question={question}
          questionCount={questionCount}
          savedOptionId={selectedOptionId}
          sessionId={sessionId}
          step={step}
          voterKey={voterKey}
        />
      ) : null}
      {status === 'closed' ? (
        <div className="receipt-state" role="status">
          <CheckCircle2 size={30} aria-hidden="true" />
          <div>
            <h2>Liveøkten er avsluttet</h2>
            <p>Takk for at du deltok.</p>
          </div>
        </div>
      ) : null}
      <RespondentPrivacyNotice isIdentified={false} privacySettings={privacy} />
    </Panel>
  );
}

function LiveVoteForm({
  question,
  questionCount,
  savedOptionId,
  sessionId,
  step,
  voterKey,
}: {
  question: LiveSurveyQuestion;
  questionCount: number;
  savedOptionId: string | null;
  sessionId: string;
  step: number;
  voterKey: string;
}) {
  const [optionId, setOptionId] = useState('');
  const vote = useSubmitLiveSurveyVote(sessionId, voterKey, step, question.id);
  const confirmedOption = vote.data ?? savedOptionId;
  const selected = confirmedOption ?? optionId;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (optionId && !confirmedOption && !vote.isPending) {
      vote.mutate(optionId);
    }
  }

  return (
    <form className="respondent-form" onSubmit={handleSubmit}>
      <p className="eyebrow">Spørsmål {step + 1} av {questionCount}</p>
      <div className="respondent-question">
        <div className="respondent-question__header">
          <div className="question-card__icon" aria-hidden="true"><ListChecks size={20} /></div>
          <div>
            <h2 id="live-question-prompt">{question.prompt}</h2>
            {question.description ? <p>{question.description}</p> : null}
          </div>
        </div>
        <div role="group" aria-labelledby="live-question-prompt">
          <SurveyChoiceList
            disabled={Boolean(confirmedOption) || vote.isPending}
            name={question.id}
            onChange={(ids) => setOptionId(ids[0] ?? '')}
            options={question.options}
            selectedIds={selected ? [selected] : []}
          />
        </div>
      </div>
      {confirmedOption ? (
        <div className="receipt-state" role="status">
          <CheckCircle2 size={30} aria-hidden="true" />
          <div>
            <strong>Svar registrert</strong>
            <p>
              {step + 1 < questionCount
                ? 'Neste spørsmål vises automatisk.'
                : 'Venter på at verten avslutter økten.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {vote.isError ? (
            <div className="form-alert form-alert--error" role="alert">
              {getUserFacingErrorMessage(vote.error, 'Kunne ikke sende svaret. Prøv igjen.')}
            </div>
          ) : null}
          <div className="form-actions">
            <button className="button button--primary" disabled={!optionId || vote.isPending} type="submit">
              {vote.isPaused ? 'Venter på nett …' : vote.isPending ? 'Sender …' : 'Send svar'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
