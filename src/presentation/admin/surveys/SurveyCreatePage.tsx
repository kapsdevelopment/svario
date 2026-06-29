import { Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useCreateSurveyDraft } from '../../../application/surveys/useCreateSurveyDraft';
import { useWorkspaces } from '../../../application/workspaces/useWorkspaces';
import type { SurveyResponseMode } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

const individualWorkspaceValue = 'individual';
const durationPresets = [
  { label: '24 timer', days: 1 },
  { label: '1 uke', days: 7 },
  { label: '2 uker', days: 14 },
  { label: '3 uker', days: 21 },
  { label: '1 mnd', months: 1 },
] as const;

export function SurveyCreatePage() {
  const { account } = useAuth();
  const createSurveyDraft = useCreateSurveyDraft();
  const workspaces = useWorkspaces(account?.id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responseMode, setResponseMode] =
    useState<SurveyResponseMode>('anonymous');
  const [workspaceId, setWorkspaceId] = useState(individualWorkspaceValue);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSaving = createSurveyDraft.isPending;

  function handleDurationPreset(preset: (typeof durationPresets)[number]) {
    setValidationError(null);

    const startDate = parseDateTimeInputValue(startsAt) ?? new Date();
    const endDate = addDuration(startDate, preset);

    setStartsAt(formatDateTimeInputValue(startDate));
    setEndsAt(formatDateTimeInputValue(endDate));
  }

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
        workspaceId:
          workspaceId === individualWorkspaceValue ? null : workspaceId,
        visibility:
          workspaceId === individualWorkspaceValue ? 'private' : 'workspace',
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
              Arbeidsflate (individuell, team eller organisasjon)
              <select
                value={workspaceId}
                disabled={workspaces.isLoading}
                onChange={(event) => setWorkspaceId(event.target.value)}
              >
                <option value={individualWorkspaceValue}>
                  Individuell - personlig konto
                </option>
                {workspaces.data?.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>
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
          <div className="duration-presets" aria-label="Hurtigvalg for varighet">
            <span>Varighet</span>
            <div>
              {durationPresets.map((preset) => (
                <button
                  className="duration-preset-button"
                  type="button"
                  disabled={isSaving}
                  key={preset.label}
                  onClick={() => handleDurationPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          {validationError ? (
            <div className="form-alert form-alert--error" role="alert">
              {validationError}
            </div>
          ) : null}
          {createSurveyDraft.isError ? (
            <div className="form-alert form-alert--error" role="alert">
              {getUserFacingErrorMessage(
                createSurveyDraft.error,
                'Kunne ikke lagre skjemaet.',
              )}
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

function parseDateTimeInputValue(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTimeInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function addDuration(
  startDate: Date,
  preset: (typeof durationPresets)[number],
) {
  const endDate = new Date(startDate);

  if ('months' in preset) {
    endDate.setMonth(endDate.getMonth() + preset.months);
    return endDate;
  }

  endDate.setDate(endDate.getDate() + preset.days);
  return endDate;
}
