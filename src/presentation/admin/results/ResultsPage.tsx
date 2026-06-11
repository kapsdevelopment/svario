import { Download } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Panel } from '../../shared/components/Panel';

const likertData = [
  { value: '1', responses: 4 },
  { value: '2', responses: 9 },
  { value: '3', responses: 26 },
  { value: '4', responses: 58 },
  { value: '5', responses: 29 },
];

export function ResultsPage() {
  const { surveyId = 'demo' } = useParams();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analyse</p>
          <h1>Resultater</h1>
          <p>Skjema: {surveyId}</p>
        </div>
      </header>

      <Panel title="Svarfordeling" subtitle="Likert 1-5 · gjennomsnitt 4,2">
        <div className="chart-frame" aria-label="Svarfordeling">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={likertData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="value" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="responses" fill="#183a34" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title="Eksport"
        subtitle="CSV og PDF"
        action={
          <button className="button button--secondary" type="button">
            <Download size={18} aria-hidden="true" />
            Last ned
          </button>
        }
      />
    </div>
  );
}
