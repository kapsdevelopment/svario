import { BarChart3, TreePine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import type { SurveySummary } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function DashboardPage() {
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();
  const activeSurveys = surveys.filter(isActiveSurvey);
  const draftSurveys = surveys.filter((survey) => survey.status === 'draft');
  const heroSurvey = getDashboardHeroSurvey(surveys);

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
          <p className="eyebrow">{getDashboardHeroEyebrow(heroSurvey)}</p>
          <h2 id="dashboard-current-title">
            {heroSurvey?.title ?? 'Bygg ditt første skjema'}
          </h2>
          <p>
            {heroSurvey
              ? formatSurveySummary(heroSurvey, activeSurveys.length)
              : 'Når du oppretter et skjema, dukker status og videre arbeid opp her.'}
          </p>
        </div>
        <Link
          className="button dashboard-hero__action"
          to={
            heroSurvey
              ? getPrimarySurveyRoute(heroSurvey)
              : routes.newSurvey
          }
        >
          <BarChart3 size={18} aria-hidden="true" />
          {heroSurvey?.status === 'draft'
            ? 'Rediger skjema'
            : heroSurvey
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
            {surveys.map((survey) => {
              const isLive = isActiveSurvey(survey);

              return (
                <Link
                  className={`table-list__row table-list__row--link${
                    isLive ? ' table-list__row--live' : ''
                  }`}
                  key={survey.id}
                  to={getPrimarySurveyRoute(survey)}
                >
                  <span>{survey.title}</span>
                  <span className="table-list__row-meta">
                    <span>{statusLabel[survey.status]}</span>
                    {isLive ? (
                      <span
                        className="live-pine-indicator"
                        aria-label="Live og pågår"
                        title="Live og pågår"
                      >
                        <TreePine size={17} aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
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

function formatSurveySummary(survey: SurveySummary, activeSurveyCount = 0) {
  if (isActiveSurvey(survey)) {
    const activeCountText =
      activeSurveyCount > 1
        ? `${activeSurveyCount} aktive skjemaer pågår nå. `
        : '';

    if (survey.endsAt) {
      return `${activeCountText}Dette skjemaet er åpent til ${formatDate(
        survey.endsAt,
      )}.`;
    }

    return `${activeCountText}Dette skjemaet er publisert uten sluttdato.`;
  }

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

function getDashboardHeroEyebrow(survey: SurveySummary | null) {
  if (!survey) {
    return 'Kom i gang';
  }

  if (isActiveSurvey(survey)) {
    return 'Pågår nå';
  }

  if (survey.status === 'draft') {
    return 'Fortsett utkast';
  }

  return 'Siste skjema';
}

function getDashboardHeroSurvey(surveys: SurveySummary[]) {
  const activeSurveys = surveys.filter(isActiveSurvey);

  if (activeSurveys.length > 0) {
    return [...activeSurveys].sort(compareActiveSurveyPriority)[0] ?? null;
  }

  return surveys[0] ?? null;
}

function compareActiveSurveyPriority(
  firstSurvey: SurveySummary,
  secondSurvey: SurveySummary,
) {
  const firstEndsAt = getDateTime(firstSurvey.endsAt) ?? Number.POSITIVE_INFINITY;
  const secondEndsAt =
    getDateTime(secondSurvey.endsAt) ?? Number.POSITIVE_INFINITY;

  if (firstEndsAt !== secondEndsAt) {
    return firstEndsAt - secondEndsAt;
  }

  return (
    (getDateTime(secondSurvey.updatedAt) ?? 0) -
    (getDateTime(firstSurvey.updatedAt) ?? 0)
  );
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

function getDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const dateTime = new Date(value).getTime();
  return Number.isNaN(dateTime) ? null : dateTime;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
