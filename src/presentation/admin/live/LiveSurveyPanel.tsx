import { ChevronRight, Play, Radio } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useLiveSurveySessions, useStartLiveSurvey } from '../../../application/live/useLiveSurvey';
import { getLiveSurveyEligibilityIssue } from '../../../domain/live/liveSurvey';
import type { SurveyEditor } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

const sessionDateFormat = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function LiveSurveyPanel({ survey }: { survey: SurveyEditor }) {
  const navigate = useNavigate();
  const sessions = useLiveSurveySessions(survey.id);
  const start = useStartLiveSurvey(survey.id);
  const active = sessions.data?.find(({ status }) => status !== 'closed');
  const history = sessions.data?.filter(({ status }) => status === 'closed') ?? [];
  const issue = getLiveSurveyEligibilityIssue(survey);

  return (
    <Panel
      title="Liveøkt"
      subtitle="Vis ett spørsmål om gangen og la deltakerne svare med mobilen."
      action={
        active ? (
          <Link className="button button--primary" to={routes.liveSurveyHost(active.id)}>
            <Radio size={18} aria-hidden="true" />
            Åpne liveøkt
          </Link>
        ) : (
          <button
            className="button button--primary"
            disabled={Boolean(issue) || start.isPending || sessions.isPending}
            onClick={() => start.mutate(undefined, {
              onSuccess: (id) => navigate(routes.liveSurveyHost(id)),
            })}
            type="button"
          >
            <Play size={18} aria-hidden="true" />
            {start.isPending ? 'Klargjør…' : 'Start liveøkt'}
          </button>
        )
      }
    >
      <p>
        {active
          ? 'Det pågår en liveøkt for dette skjemaet.'
          : issue ?? 'Deltakerne blir med via QR-kode. Svarene lagres i en egen oppsummering for økten.'}
      </p>
      {start.isError || sessions.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getUserFacingErrorMessage(start.error ?? sessions.error, 'Kunne ikke laste liveøkten. Prøv igjen.')}
        </div>
      ) : null}
      {history.length > 0 ? (
        <details className="live-session-history">
          <summary>Tidligere liveøkter</summary>
          <ul>
            {history.map((session) => (
              <li key={session.id}>
                <Link to={routes.liveSurveyHost(session.id)}>
                  {sessionDateFormat.format(new Date(session.createdAt))}
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}
