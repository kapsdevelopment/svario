import { BarChart3, Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import type { SurveySummary } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function SurveyListPage() {
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Skjemaer</h1>
        </div>
        <Link className="button button--primary" to={routes.newSurvey}>
          <Plus size={18} aria-hidden="true" />
          Nytt skjema
        </Link>
      </header>

      {isLoading ? (
        <Panel title="Laster skjemaer" subtitle="Henter dine skjemaer fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {!isLoading && !isError && surveys.length === 0 ? (
        <Panel
          title="Ingen skjemaer ennå"
          subtitle="Opprett det første utkastet og bygg videre derfra."
          action={
            <Link className="button button--primary" to={routes.newSurvey}>
              <Plus size={18} aria-hidden="true" />
              Nytt skjema
            </Link>
          }
        />
      ) : null}

      {!isLoading && !isError && surveys.length > 0 ? (
        <div className="stack">
          {surveys.map((survey) => (
            <Panel
              key={survey.id}
              title={survey.title}
              subtitle={formatSurveyMeta(survey)}
              action={
                <div className="inline-actions">
                  <Link
                    className="icon-button"
                    to={routes.editSurvey(survey.id)}
                    aria-label={`Rediger ${survey.title}`}
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </Link>
                  <Link
                    className="icon-button"
                    to={routes.results(survey.id)}
                    aria-label={`Se resultater for ${survey.title}`}
                  >
                    <BarChart3 size={20} aria-hidden="true" />
                  </Link>
                </div>
              }
            >
              <div className="status-row">
                <span className={`status-pill status-pill--${survey.status}`}>
                  {statusLabel[survey.status]}
                </span>
                <span>{responseModeLabel[survey.responseMode]}</span>
                <span>{formatUpdatedAt(survey.updatedAt)}</span>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const statusLabel = {
  draft: 'Utkast',
  published: 'Publisert',
  closed: 'Lukket',
} satisfies Record<SurveySummary['status'], string>;

const responseModeLabel = {
  anonymous: 'Anonyme svar',
  identified: 'Identifiserte svar',
} satisfies Record<SurveySummary['responseMode'], string>;

function formatSurveyMeta(survey: SurveySummary) {
  if (survey.startsAt && survey.endsAt) {
    return `${statusLabel[survey.status]} · ${formatDate(survey.startsAt)}-${formatDate(
      survey.endsAt,
    )}`;
  }

  if (survey.endsAt) {
    return `${statusLabel[survey.status]} · varer til ${formatDate(survey.endsAt)}`;
  }

  if (survey.startsAt) {
    return `${statusLabel[survey.status]} · starter ${formatDate(survey.startsAt)}`;
  }

  return `${statusLabel[survey.status]} · uten tidsavgrensning`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatUpdatedAt(value: string) {
  return `Oppdatert ${formatDate(value)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke hente skjemaer.';
}
