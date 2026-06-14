import { useParams } from 'react-router-dom';

import { Panel } from '../../shared/components/Panel';

export function RespondentPage() {
  const { slug = 'demo' } = useParams();

  return (
    <main className="respondent-page image-page image-page--fjord">
      <div className="respondent-card">
        <p className="eyebrow">Svario</p>
        <Panel title="Medarbeiderpuls" subtitle={slug}>
          <fieldset className="likert">
            <legend>Hvor enig er du i påstanden?</legend>
            <div className="likert__options">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="likert-demo"
                    value={value}
                    defaultChecked={value === 4}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-actions">
            <button className="button button--primary" type="button">
              Send inn
            </button>
          </div>
        </Panel>
      </div>
    </main>
  );
}
