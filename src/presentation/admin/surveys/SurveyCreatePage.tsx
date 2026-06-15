import { Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useCreateSurveyDraft } from '../../../application/surveys/useCreateSurveyDraft';
import type { SurveyResponseMode } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function SurveyCreatePage() {
  const { account } = useAuth();
  const createSurveyDraft = useCreateSurveyDraft();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responseMode, setResponseMode] =
    useState<SurveyResponseMode>('anonymous');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSaving = createSurveyDraft.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setValidationError('Skjemaet må ha en tittel.');
      return;
    }

    if (!account) {
      setValidationError('Domenekontoen er ikke klar ennå.');
      return;
    }

    const normalizedStartsAt = toIsoDateTime(startsAt);
    const normalizedEndsAt = toIsoDateTime(endsAt);

    if (
      normalizedStartsAt &&
      normalizedEndsAt &&
      new Date(normalizedEndsAt) <= new Date(normalizedStartsAt)
    ) {
      setValidationError('Slutttidspunkt må være etter starttidspunkt.');
      return;
    }

    let createdSurveyId: string;

    try {
      const createdSurvey = await createSurveyDraft.mutateAsync({
        ownerAccountId: account.id,
        title: normalizedTitle,
        description,
        responseMode,
        startsAt: normalizedStartsAt,
        endsAt: normalizedEndsAt,
      });
      createdSurveyId = createdSurvey.id;
    } catch {
      return;
    }

    navigate(routes.editSurvey(createdSurveyId));
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Skjemabygger</p>
          <h1>Nytt skjema</h1>
        </div>
      </header>

      <Panel title="Grunninfo">
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Tittel
            <input
              type="text"
              value={title}
              placeholder="Medarbeiderpuls juni"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Beskrivelse
            <textarea
              rows={4}
              value={description}
              placeholder="Kort intro til respondentene"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Besvarelser
              <select
                value={responseMode}
                onChange={(event) =>
                  setResponseMode(event.target.value as SurveyResponseMode)
                }
              >
                <option value="anonymous">Anonyme</option>
                <option value="identified">Identifiserte</option>
              </select>
            </label>
            <label>
              Starter
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </label>
            <label>
              Slutter
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </label>
          </div>
          {validationError ? (
            <div className="form-alert form-alert--error" role="alert">
              {validationError}
            </div>
          ) : null}
          {createSurveyDraft.isError ? (
            <div className="form-alert form-alert--error" role="alert">
              {getErrorMessage(createSurveyDraft.error)}
            </div>
          ) : null}
          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              <Save size={18} aria-hidden="true" />
              {isSaving ? 'Lagrer...' : 'Lagre utkast'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke lagre skjemaet.';
}
