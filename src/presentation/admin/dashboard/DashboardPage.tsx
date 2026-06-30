import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import type { SurveySummary } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function DashboardPage() {
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();
  const latestSurvey = surveys[0] ?? null;
  const activeSurveys = surveys.filter(isActiveSurvey);
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
        <DashboardMetricCard
          title="Skjemaer"
          subtitle={`${surveys.length} totalt`}
          to={routes.surveys}
        />
        <DashboardMetricCard
          title="Publisert"
          subtitle={`${activeSurveys.length} aktive`}
          to={routes.surveysFocus('active')}
        />
        <DashboardMetricCard
          title="Utkast"
          subtitle={`${draftSurveys.length} under arbeid`}
          to={routes.surveysFocus('draft')}
        />
      </div>

      {isLoading ? (
        <Panel title="Aktive skjemaer" subtitle="Henter skjemaer fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getUserFacingErrorMessage(error, 'Kunne ikke hente dashboard-data.')}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className="panel dashboard-recent-panel">
          <Link className="dashboard-panel-header-link" to={routes.surveys}>
            <div className="panel__header">
              <div>
                <h2>Siste skjemaer</h2>
                <p>{`${surveys.length} skjemaer i arbeidsflaten`}</p>
              </div>
            </div>
          </Link>
          <div className="table-list">
            {surveys.slice(0, 5).map((survey) => (
              <Link
                className="table-list__row table-list__row--link"
                key={survey.id}
                to={getPrimarySurveyRoute(survey)}
              >
                <span>{survey.title}</span>
                <span>{statusLabel[survey.status]}</span>
              </Link>
            ))}
            {surveys.length === 0 ? (
              <Link
                className="table-list__row table-list__row--link"
                to={routes.newSurvey}
              >
                <span>Ingen skjemaer ennå</span>
                <span>Opprett første</span>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

type DashboardMetricCardProps = {
  title: string;
  subtitle: string;
  to: string;
};

function DashboardMetricCard({ title, subtitle, to }: DashboardMetricCardProps) {
  return (
    <Link className="panel dashboard-metric-card" to={to}>
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
    </Link>
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

function isActiveSurvey(survey: SurveySummary) {
  if (survey.status !== 'published') {
    return false;
  }

  const now = Date.now();
  const startsAt = survey.startsAt ? new Date(survey.startsAt).getTime() : null;
  const endsAt = survey.endsAt ? new Date(survey.endsAt).getTime() : null;

  if (startsAt !== null && startsAt > now) {
    return false;
  }

  return endsAt === null || endsAt > now;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
