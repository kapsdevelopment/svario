import { ArrowLeft, Download, MessageSquareText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { routes } from '../../../app/routes';
import { useSurveyResults } from '../../../application/surveys/useSurveyResults';
import type {
  SurveyChoiceResult,
  SurveyLikertResult,
  SurveyQuestionResult,
  SurveyResults,
} from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function ResultsPage() {
  const { surveyId } = useParams();
  const { data: results, error, isError, isLoading } = useSurveyResults(surveyId);

  if (!surveyId) {
    return (
      <div className="page">
        <div className="form-alert form-alert--error" role="alert">
          Mangler skjema-id.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analyse</p>
          <h1>{results?.title ?? 'Resultater'}</h1>
          {results ? <p>{formatSurveyMeta(results)}</p> : null}
        </div>
        <Link className="button button--secondary" to={routes.surveys}>
          <ArrowLeft size={18} aria-hidden="true" />
          Skjemaer
        </Link>
      </header>

      {isLoading ? (
        <Panel title="Laster resultater" subtitle="Henter svar fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {results ? <ResultsContent results={results} /> : null}
    </div>
  );
}

function ResultsContent({ results }: { results: SurveyResults }) {
  return (
    <>
      <div className="metric-grid">
        <Panel title="Svar" subtitle={`${results.responseCount} totalt`} />
        <Panel title="Spørsmål" subtitle={`${results.questionResults.length} totalt`} />
        <Panel
          title="Siste svar"
          subtitle={
            results.lastSubmittedAt
              ? formatDateTime(results.lastSubmittedAt)
              : 'Ingen svar ennå'
          }
        />
      </div>

      {results.responseCount === 0 ? (
        <Panel title="Ingen svar ennå" subtitle="Del lenken og kom tilbake hit." />
      ) : null}

      <div className="results-stack">
        {results.questionResults.map((questionResult) => (
          <QuestionResultCard
            key={questionResult.question.id}
            result={questionResult}
            responseCount={results.responseCount}
          />
        ))}
      </div>

      <Panel
        title="Eksport"
        subtitle="CSV og PDF kommer i neste eksport-slice"
        action={
          <button className="button button--secondary" type="button" disabled>
            <Download size={18} aria-hidden="true" />
            Last ned
          </button>
        }
      />
    </>
  );
}

function QuestionResultCard({
  responseCount,
  result,
}: {
  responseCount: number;
  result: SurveyQuestionResult;
}) {
  return (
    <Panel
      title={result.question.prompt}
      subtitle={`${questionTypeLabel[result.question.type]} · ${result.answeredCount}/${responseCount} besvart`}
    >
      {result.question.description ? (
        <p className="result-question-description">{result.question.description}</p>
      ) : null}

      {result.question.type === 'multiple_choice' ? (
        <ChoiceResultView results={result.choiceResults} />
      ) : null}

      {result.question.type === 'likert_scale' ? (
        <LikertResultView
          average={result.likertAverage}
          results={result.likertResults}
        />
      ) : null}

      {result.question.type === 'free_text' ? (
        <FreeTextResultView results={result.freeTextResults} />
      ) : null}

      {result.skippedCount > 0 ? (
        <div className="result-muted">
          {result.skippedCount} uten svar på dette spørsmålet.
        </div>
      ) : null}
    </Panel>
  );
}

function ChoiceResultView({ results }: { results: SurveyChoiceResult[] }) {
  if (results.length === 0) {
    return <div className="empty-state">Ingen alternativer er registrert.</div>;
  }

  return (
    <div className="result-layout">
      <div className="chart-frame" aria-label="Svarfordeling">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={results}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#183a34" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ResultBarList
        items={results.map((result) => ({
          id: result.optionId,
          label: result.label,
          count: result.count,
          percentage: result.percentage,
        }))}
      />
    </div>
  );
}

function LikertResultView({
  average,
  results,
}: {
  average: number | null;
  results: SurveyLikertResult[];
}) {
  return (
    <div className="result-layout">
      <div className="result-average">
        <span>Gjennomsnitt</span>
        <strong>{average === null ? 'Ingen' : average.toLocaleString('nb-NO')}</strong>
      </div>
      <div className="chart-frame" aria-label="Skalafordeling">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={results}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="value" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f6c5d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ResultBarList
        items={results.map((result) => ({
          id: String(result.value),
          label: String(result.value),
          count: result.count,
          percentage: result.percentage,
        }))}
      />
    </div>
  );
}

function FreeTextResultView({ results }: { results: SurveyQuestionResult['freeTextResults'] }) {
  if (results.length === 0) {
    return (
      <div className="empty-state">
        <MessageSquareText size={28} aria-hidden="true" />
        <p>Ingen fritekstsvar ennå.</p>
      </div>
    );
  }

  return (
    <div className="free-text-results">
      {results.map((result) => (
        <article key={result.answerId}>
          <p>{result.text}</p>
          <span>
            {result.respondentLabel ?? 'Anonymt svar'} ·{' '}
            {formatDateTime(result.submittedAt)}
          </span>
        </article>
      ))}
    </div>
  );
}

function ResultBarList({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    count: number;
    percentage: number;
  }>;
}) {
  return (
    <div className="result-bar-list">
      {items.map((item) => (
        <div className="result-bar-row" key={item.id}>
          <div>
            <strong>{item.label}</strong>
            <span>
              {item.count} svar · {item.percentage} %
            </span>
          </div>
          <div className="result-bar-track" aria-hidden="true">
            <span style={{ width: `${item.percentage}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const questionTypeLabel = {
  multiple_choice: 'Flervalg',
  free_text: 'Fritekst',
  likert_scale: 'Skala',
} satisfies Record<SurveyQuestionResult['question']['type'], string>;

function formatSurveyMeta(results: SurveyResults) {
  const responseMode =
    results.responseMode === 'anonymous' ? 'Anonyme svar' : 'Identifiserte svar';
  return `${responseMode} · ${statusLabel[results.status]} · ${results.slug}`;
}

const statusLabel = {
  draft: 'Utkast',
  published: 'Publisert',
  closed: 'Lukket',
} satisfies Record<SurveyResults['status'], string>;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke hente resultatene akkurat nå.';
}
