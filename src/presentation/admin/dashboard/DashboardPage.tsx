import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import type { SurveySummary } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function DashboardPage() {
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();
  const latestSurvey = surveys[0] ?? null;
  const publishedSurveys = surveys.filter((survey) => survey.status === 'published');
  const draftSurveys = surveys.filter((survey) => survey.status === 'draft');

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Oversikt</p>
          <h1>Dashboard</h1>
        </div>
        <Link className="button button--primary" to={routes.newSurvey}>
          Nytt skjema
        </Link>
      </header>

      <section
        className="dashboard-hero"
        aria-labelledby="dashboard-current-title"
      >
        <div>
          <p className="eyebrow">Pågår nå</p>
          <h2 id="dashboard-current-title">
            {latestSurvey?.title ?? 'Bygg ditt første skjema'}
          </h2>
          <p>
            {latestSurvey
              ? formatSurveySummary(latestSurvey)
              : 'Når du oppretter et skjema, dukker status og videre arbeid opp her.'}
          </p>
        </div>
        <Link
          className="button dashboard-hero__action"
          to={
            latestSurvey
              ? getPrimarySurveyRoute(latestSurvey)
              : routes.newSurvey
          }
        >
          <BarChart3 size={18} aria-hidden="true" />
          {latestSurvey?.status === 'draft'
            ? 'Rediger skjema'
            : latestSurvey
              ? 'Se resultater'
              : 'Nytt skjema'}
        </Link>
      </section>

      <div className="metric-grid">
        <Panel title="Skjemaer" subtitle={`${surveys.length} totalt`} />
        <Panel title="Publisert" subtitle={`${publishedSurveys.length} aktive`} />
        <Panel title="Utkast" subtitle={`${draftSurveys.length} under arbeid`} />
      </div>

      {isLoading ? (
        <Panel title="Aktive skjemaer" subtitle="Henter skjemaer fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <Panel
          title="Siste skjemaer"
          subtitle={`${surveys.length} skjemaer i arbeidsflaten`}
        >
          <div className="table-list">
            {surveys.slice(0, 5).map((survey) => (
              <div className="table-list__row" key={survey.id}>
                <Link to={getPrimarySurveyRoute(survey)}>{survey.title}</Link>
                <span>{statusLabel[survey.status]}</span>
              </div>
            ))}
            {surveys.length === 0 ? (
              <div className="table-list__row">
                <span>Ingen skjemaer ennå</span>
                <Link to={routes.newSurvey}>Opprett første</Link>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

const statusLabel = {
  draft: 'Utkast',
  published: 'Publisert',
  closed: 'Lukket',
} satisfies Record<SurveySummary['status'], string>;

function formatSurveySummary(survey: SurveySummary) {
  if (survey.status === 'draft') {
    return 'Utkastet er klart for videre redigering og spørsmål.';
  }

  if (survey.status === 'closed') {
    return 'Skjemaet er lukket for nye besvarelser.';
  }

  return survey.endsAt
    ? `Publisert og åpent til ${formatDate(survey.endsAt)}.`
    : 'Publisert uten sluttdato.';
}

function getPrimarySurveyRoute(survey: SurveySummary) {
  return survey.status === 'draft'
    ? routes.editSurvey(survey.id)
    : routes.results(survey.id);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke hente dashboard-data.';
}
