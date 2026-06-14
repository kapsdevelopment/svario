import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

import { routes } from '../../../app/routes';
import { Panel } from '../../shared/components/Panel';

const activeSurveys = [
  { title: 'Medarbeiderpuls juni', responses: 126 },
  { title: 'Kursfeedback', responses: 84 },
  { title: 'Produktinnsikt Q3', responses: 38 },
];

export function DashboardPage() {
  return (
    <div className="page page--dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">Oversikt</p>
          <h1>Dashboard</h1>
        </div>
        <Link className="button button--primary" to={routes.newSurvey}>
          Nytt skjema
        </Link>
      </header>

      <section className="dashboard-hero" aria-labelledby="dashboard-current-title">
        <div>
          <p className="eyebrow">Pågår nå</p>
          <h2 id="dashboard-current-title">Medarbeiderpuls juni</h2>
          <p>126 svar samlet inn. Svarraten ligger over snittet for de siste skjemaene.</p>
        </div>
        <Link className="button dashboard-hero__action" to={routes.results('demo')}>
          <BarChart3 size={18} aria-hidden="true" />
          Se resultater
        </Link>
      </section>

      <div className="metric-grid">
        <Panel title="Besvarelser" subtitle="248 denne måneden" />
        <Panel title="Svarrate" subtitle="71 % gjennomsnitt" />
        <Panel title="Publisert" subtitle="3 aktive skjemaer" />
      </div>

      <Panel title="Aktive skjemaer" subtitle="3 publiserte skjemaer">
        <div className="table-list">
          {activeSurveys.map((survey) => (
            <div className="table-list__row" key={survey.title}>
              <span>{survey.title}</span>
              <span>{survey.responses} svar</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
