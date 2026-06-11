import { Save } from 'lucide-react';

import { Panel } from '../../shared/components/Panel';

export function SurveyCreatePage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Skjemabygger</p>
          <h1>Nytt skjema</h1>
        </div>
      </header>

      <Panel title="Grunninfo">
        <form className="form-stack">
          <label>
            Tittel
            <input type="text" placeholder="Medarbeiderpuls juni" />
          </label>
          <label>
            Beskrivelse
            <textarea rows={4} placeholder="Kort intro til respondentene" />
          </label>
          <div className="form-actions">
            <button className="button button--primary" type="button">
              <Save size={18} aria-hidden="true" />
              Lagre utkast
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
