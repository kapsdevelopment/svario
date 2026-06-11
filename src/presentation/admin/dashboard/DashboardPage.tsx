import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { Panel } from '../../shared/components/Panel';

const activeSurveys = [
  { title: 'Medarbeiderpuls juni', responses: 126 },
  { title: 'Kursfeedback', responses: 84 },
  { title: 'Produktinnsikt Q3', responses: 38 },
];

export function DashboardPage() {
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
