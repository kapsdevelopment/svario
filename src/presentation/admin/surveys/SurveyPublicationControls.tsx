import { CircleStop, Undo2 } from 'lucide-react';
import { useState } from 'react';

import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import {
  useStopSurveyPublication,
  useSurveyPublicationActions,
} from '../../../application/surveys/useSurveyPublication';
import type { SurveyPublicationAction, SurveySummary } from '../../../domain/surveys/survey';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

type PublicationSurvey = Pick<SurveySummary, 'id' | 'liveOnly' | 'slug' | 'status' | 'title'>;

type PublicationChange = {
  survey: PublicationSurvey;
  action: SurveyPublicationAction;
};

const actionDetails = {
  unpublish: { label: 'Angre publisering', icon: Undo2 },
  close: { label: 'Steng for nye svar', icon: CircleStop },
};

export function useSurveyPublicationControls(
  surveys: PublicationSurvey[],
  onUnpublish?: (surveyId: string) => void,
) {
  const available = useSurveyPublicationActions(
    surveys.filter((survey) => survey.status === 'published').map((survey) => survey.id),
  );
  const stop = useStopSurveyPublication();
  const [selected, setSelected] = useState<PublicationChange | null>(null);
  const [completed, setCompleted] = useState<PublicationChange | null>(null);

  function renderButton(survey: PublicationSurvey, className = '') {
    const action = available.data?.[survey.id];
    if (!action || survey.status !== 'published') return null;

    const { label, icon: Icon } = actionDetails[action];
    return (
      <button
        className={`button button--secondary ${className}`}
        type="button"
        disabled={stop.isPending}
        onClick={() => {
          stop.reset();
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
      await stop.mutateAsync(selected);
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
  const notice = completed?.action === 'unpublish' && completedStatus === 'draft'
    ? 'Skjemaet er tilbake som utkast.'
    : completed?.action === 'close' && completedStatus === 'closed'
      ? 'Skjemaet er stengt for nye svar. Svarene er beholdt.'
      : null;
  const label = selected ? actionDetails[selected.action].label : '';
  const feedback = stop.isError ? (
    <div className="form-alert form-alert--error" role="alert">
      {getUserFacingErrorMessage(stop.error, 'Kunne ikke endre publiseringen. Prøv igjen.')}
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
        description={selected?.action === 'unpublish'
          ? selected.survey.liveOnly
            ? `«${selected.survey.title}» blir et utkast. Du kan redigere skjemaet og starte en ny liveøkt.`
            : `«${selected.survey.title}» blir et utkast. Du kan redigere skjemaet og publisere det på samme lenke igjen.`
          : `«${selected?.survey.title ?? ''}» stenges for nye svar. Svarene som har kommet inn, bevares.`}
        confirmLabel={label}
        isPending={stop.isPending}
        onCancel={() => setSelected(null)}
        onConfirm={confirm}
      />
    ),
  };
}
