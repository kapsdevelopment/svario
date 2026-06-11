import { BarChart3, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { Panel } from '../../shared/components/Panel';

const surveys = [
  {
    title: 'Medarbeiderpuls juni',
    meta: 'Publisert · 126 svar · anonym',
    id: 'demo',
  },
  {
    title: 'Kursfeedback',
    meta: 'Publisert · 84 svar · identifisert',
    id: 'course-feedback',
  },
  {
    title: 'Produktinnsikt Q3',
    meta: 'Utkast · 0 svar',
    id: 'product-q3',
  },
];

export function SurveyListPage() {
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

      <div className="stack">
        {surveys.map((survey) => (
          <Panel
            key={survey.id}
            title={survey.title}
            subtitle={survey.meta}
            action={
              <Link
                className="icon-button"
                to={routes.results(survey.id)}
                aria-label={`Se resultater for ${survey.title}`}
              >
                <BarChart3 size={20} aria-hidden="true" />
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
}
