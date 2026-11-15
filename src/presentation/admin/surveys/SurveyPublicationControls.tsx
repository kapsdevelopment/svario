import { CalendarDays, CircleStop, LockOpen, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import {
  useChangeSurveyPublication,
  useSurveyPublicationActions,
} from '../../../application/surveys/useSurveyPublication';
import type { SurveyPublicationAction, SurveySummary } from '../../../domain/surveys/survey';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

type PublicationSurvey = Pick<SurveySummary, 'id' | 'liveOnly' | 'slug' | 'status' | 'title' | 'startsAt' | 'endsAt'>;

type PublicationChange = {
  survey: PublicationSurvey;
  action: SurveyPublicationAction;
};

const actionDetails = {
  unpublish: {
    label: 'Angre publisering', icon: Undo2, status: 'draft',
    notice: 'Skjemaet er tilbake som utkast.',
  },
  close: {
    label: 'Steng for nye svar', icon: CircleStop, status: 'closed',
    notice: 'Skjemaet er stengt for nye svar. Svarene er beholdt.',
  },
  reopen: {
    label: 'Åpne for nye svar', icon: LockOpen, status: 'published',
    notice: 'Skjemaet er åpnet for nye svar på samme lenke.',
  },
} as const;

export function useSurveyPublicationControls(
  surveys: PublicationSurvey[],
  onUnpublish?: (surveyId: string) => void,
) {
  const available = useSurveyPublicationActions(
    surveys.filter((survey) => survey.status !== 'draft').map((survey) => survey.id),
  );
  const change = useChangeSurveyPublication();
  const [selected, setSelected] = useState<PublicationChange | null>(null);
  const [completed, setCompleted] = useState<PublicationChange | null>(null);

  function renderButton(survey: PublicationSurvey, className = '') {
    const action = available.data?.[survey.id];
    if (!action || survey.status !== (action === 'reopen' ? 'closed' : 'published')) {
      return null;
    }

    const buttonClass = `button button--secondary ${className}`;
    if (action === 'reopen' && !isWithinResponsePeriod(survey)) {
      return (
        <Link className={buttonClass} to={routes.editSurveyDuration(survey.id)}>
          <CalendarDays size={16} aria-hidden="true" />
          Endre varighet
        </Link>
      );
    }

    const { label, icon: Icon } = actionDetails[action];
    return (
      <button
        className={buttonClass}
        type="button"
        disabled={change.isPending}
        onClick={() => {
          change.reset();
          setCompleted(null);
          setSelected({ survey, action });
        }}
      >
        <Icon size={16} aria-hidden="true" />
        {label}
      </button>
    );
  }

  async function confirm() {
    if (!selected) return;
    try {
      await change.mutateAsync(selected);
      if (selected.action === 'unpublish' && onUnpublish) {
        onUnpublish(selected.survey.id);
      } else {
        setCompleted(selected);
      }
    } catch {
      // The error is shown alongside the controls after the dialog closes.
    } finally {
      setSelected(null);
    }
  }

  const completedStatus = surveys.find((survey) => survey.id === completed?.survey.id)?.status;
  const details = completed ? actionDetails[completed.action] : null;
  const notice = details && details.status === completedStatus ? details.notice : null;
  const label = selected ? actionDetails[selected.action].label : '';
  const feedback = change.isError ? (
    <div className="form-alert form-alert--error" role="alert">
      {getUserFacingErrorMessage(change.error, 'Kunne ikke endre publiseringen. Prøv igjen.')}
    </div>
  ) : notice ? (
    <div className="form-alert form-alert--success" role="status">{notice}</div>
  ) : null;

  return {
    renderButton,
    feedback,
    dialog: (
      <ConfirmDialog
        open={selected !== null}
        title={`${label}?`}
        description={selected ? getConfirmationText(selected) : ''}
        confirmLabel={label}
        isPending={change.isPending}
        onCancel={() => setSelected(null)}
        onConfirm={confirm}
      />
    ),
  };
}

function getConfirmationText({ action, survey }: PublicationChange) {
  const title = `«${survey.title}»`;
  switch (action) {
    case 'unpublish':
      return survey.liveOnly
        ? `${title} blir et utkast. Du kan redigere skjemaet og starte en ny liveøkt.`
        : `${title} blir et utkast. Du kan redigere skjemaet og publisere det på samme lenke igjen.`;
    case 'close':
      return `${title} stenges for nye svar. Svarene som har kommet inn, bevares.`;
    case 'reopen':
      return `${title} åpnes for nye svar på samme lenke. Svarene som har kommet inn, bevares.`;
  }
}

function isWithinResponsePeriod({ startsAt, endsAt }: PublicationSurvey) {
  const now = Date.now();
  return (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) > now);
}
