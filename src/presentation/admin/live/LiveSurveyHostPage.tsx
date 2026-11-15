import { ArrowLeft, Check, ChevronRight, Copy, Play, Radio, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useAdvanceLiveSurvey, useLiveSurveyHost } from '../../../application/live/useLiveSurvey';
import {
  getLiveSurveyResults,
  isLiveSurveyId,
  type LiveSurveyHostState,
  type LiveSurveyResult,
} from '../../../domain/live/liveSurvey';
import { Panel } from '../../shared/components/Panel';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { ChoiceResultView, LikertResultView } from '../results/ResultsPage';

export function LiveSurveyHostPage() {
  const { sessionId } = useParams();
  return isLiveSurveyId(sessionId)
    ? <LiveSurveyHost key={sessionId} sessionId={sessionId} />
    : <HostStatus title="Fant ikke liveøkten" />;
}

function LiveSurveyHost({ sessionId }: { sessionId: string }) {
  const session = useLiveSurveyHost(sessionId);
  const advance = useAdvanceLiveSurvey(sessionId);
  const [confirmFinish, setConfirmFinish] = useState(false);

  if (session.isPending) {
    return <HostStatus title="Laster liveøkt" />;
  }
  if (!session.data) {
    return (
      <HostStatus
        title="Liveøkten er ikke tilgjengelig"
        detail={session.isError ? 'Sjekk forbindelsen og prøv igjen.' : 'Lenken kan være utløpt.'}
        retry={session.isError ? () => { void session.refetch(); } : undefined}
      />
    );
  }

  const current = session.data;
  const isLobby = current.status === 'lobby';
  const isClosed = current.status === 'closed';
  const isLast = current.step === current.questionCount - 1;
  const currentResult = current.results[0];
  const participantUrl = new URL(window.location.href);
  participantUrl.hash = routes.liveSurveyParticipant(sessionId);
  const joinUrl = participantUrl.toString();

  function changeQuestion(finish: boolean) {
    advance.mutate({ step: current.step, finish }, {
      onSettled: () => setConfirmFinish(false),
    });
  }

  return (
    <main className="presentation-mode live-survey-host">
      <header className="presentation-mode__topbar">
        <div>
          <span>Svario · Liveøkt</span>
          <strong>{current.title}</strong>
        </div>
        <Link
          aria-label="Tilbake til skjema"
          className="presentation-mode__close"
          title="Tilbake til skjema"
          to={routes.editSurvey(current.surveyId)}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
      </header>

      {isLobby ? (
        <section className="presentation-slide live-survey-lobby">
          <div>
            <p className="eyebrow">Klar til å bli med?</p>
            <h1>Skann QR-koden</h1>
            <p>Åpne kameraet på mobilen. Spørsmålene vises når verten starter.</p>
          </div>
          <JoinCode url={joinUrl} size={320} />
          <CopyJoinLink url={joinUrl} />
        </section>
      ) : isClosed ? (
        <LiveSurveySummary session={current} />
      ) : currentResult ? (
        <LiveQuestionSlide questionCount={current.questionCount} result={currentResult} url={joinUrl} />
      ) : null}

      <footer className="presentation-mode__footer live-survey-controls">
        {!isClosed ? (
          <>
            {!isLast ? (
              <button
                className="button button--secondary"
                disabled={advance.isPending}
                onClick={() => setConfirmFinish(true)}
                type="button"
              >
                <Square size={16} aria-hidden="true" />
                Avslutt økt
              </button>
            ) : <span />}
            <div className="live-survey-host__status" aria-live="polite">
              {(session.isRefetchError || session.fetchStatus === 'paused')
                ? 'Mistet forbindelsen. Prøver igjen …'
                : advance.isError
                  ? getUserFacingErrorMessage(advance.error, 'Kunne ikke oppdatere økten. Prøv igjen.')
                  : isLobby
                    ? `${current.questionCount} spørsmål i økten`
                    : 'Tar imot svar'}
            </div>
            <button
              className="button button--primary"
              disabled={advance.isPending}
              onClick={() => isLast ? setConfirmFinish(true) : changeQuestion(false)}
              type="button"
            >
              {isLobby ? <Play size={18} aria-hidden="true" /> : null}
              {isLobby ? 'Vis første spørsmål' : isLast ? 'Avslutt økt' : 'Neste spørsmål'}
              {!isLobby && !isLast ? <ChevronRight size={18} aria-hidden="true" /> : null}
            </button>
          </>
        ) : (
          <Link className="button button--secondary" to={routes.editSurvey(current.surveyId)}>
            <ArrowLeft size={18} aria-hidden="true" />
            Tilbake til skjema
          </Link>
        )}
      </footer>

      <ConfirmDialog
        open={confirmFinish && !isClosed}
        title="Avslutte liveøkten?"
        description="Svar stenges på deltakernes mobiler. Du finner oppsummeringen under tidligere liveøkter."
        confirmLabel="Avslutt økt"
        isPending={advance.isPending}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => changeQuestion(true)}
      />
    </main>
  );
}

function HostStatus({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return (
    <main className="presentation-mode presentation-mode--status">
      <Panel title={title} subtitle={detail}>
        <div className="inline-actions">
          {retry ? <button className="button button--primary" onClick={retry} type="button">Prøv igjen</button> : null}
          <Link className="button button--secondary" to={routes.surveys}>Til skjemaene</Link>
        </div>
      </Panel>
    </main>
  );
}

function LiveQuestionSlide({ questionCount, result, url }: { questionCount: number; result: LiveSurveyResult; url: string }) {
  const { total, results, scale } = getLiveSurveyResults(result);
  const { question } = result;

  return (
    <section
      className={`presentation-slide live-survey-slide${question.description ? ' presentation-slide--with-description' : ''}`}
    >
      <div className="presentation-slide__header">
        <div>
          <p className="eyebrow">Spørsmål {result.step + 1} av {questionCount}</p>
          <h2>{question.prompt}</h2>
          <p><Radio size={16} aria-hidden="true" /> {total} svar mottatt</p>
        </div>
        <div className="live-survey-slide__join">
          <JoinCode url={url} size={104} />
          <a href={url} target="_blank" rel="noreferrer">Bli med</a>
        </div>
      </div>
      {question.description ? <p className="presentation-slide__description">{question.description}</p> : null}
      <div className="presentation-slide__visual">
        {total === 0 ? (
          <div className="empty-state live-survey-slide__waiting">Venter på de første svarene …</div>
        ) : scale ? (
          <LikertResultView
            average={scale.average}
            chartType={question.chartType}
            colorMode={question.colorMode}
            results={scale.results}
            scaleVariant={scale.variant}
          />
        ) : (
          <ChoiceResultView chartType={question.chartType} colorMode={question.colorMode} results={results} />
        )}
      </div>
    </section>
  );
}

function JoinCode({ url, size }: { url: string; size: number }) {
  return <QRCodeSVG className="live-survey-qr" value={url} size={size} marginSize={4} level="M" title="QR-kode for å bli med i liveøkten" />;
}

function CopyJoinLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="share-link-row live-survey-share">
      <input
        aria-label="Lenke til liveøkten"
        onFocus={(event) => event.currentTarget.select()}
        readOnly
        value={url}
      />
      {navigator.clipboard ? (
        <button
          className="button button--secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          type="button"
        >
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? 'Kopiert' : 'Kopier lenke'}
        </button>
      ) : null}
    </div>
  );
}

function LiveSurveySummary({ session }: { session: LiveSurveyHostState }) {
  return (
    <section className="presentation-slide live-survey-summary">
      <header className="presentation-slide__header">
        <div>
          <p className="eyebrow">Oppsummering</p>
          <h2>Liveøkten er avsluttet</h2>
        </div>
      </header>
      {session.results.length === 0 ? <p>Ingen spørsmål ble åpnet.</p> : null}
      <div className="live-survey-summary__results">
        {session.results.map((result) => {
          const { total, results } = getLiveSurveyResults(result);
          return (
            <details key={result.question.id}>
              <summary>
                <span>{result.step + 1}. {result.question.prompt}</span>
                <span>{total} svar</span>
              </summary>
              <dl>
                {results.map((choice) => (
                  <div key={choice.optionId}>
                    <dt>{choice.label}</dt>
                    <dd>{choice.count}</dd>
                  </div>
                ))}
              </dl>
            </details>
          );
        })}
      </div>
    </section>
  );
}
