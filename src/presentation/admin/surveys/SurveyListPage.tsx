import { BarChart3, CopyPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useDeleteSurvey } from '../../../application/surveys/useDeleteSurvey';
import { useRepeatSurveyOnce } from '../../../application/surveys/useRepeatSurveyOnce';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import { useWorkspaces } from '../../../application/workspaces/useWorkspaces';
import type { SurveySummary } from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function SurveyListPage() {
  const { account } = useAuth();
  const navigate = useNavigate();
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();
  const { data: workspaces = [] } = useWorkspaces(account?.id);
  const deleteSurvey = useDeleteSurvey();
  const repeatSurveyOnce = useRepeatSurveyOnce();
  const workspaceNameById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.name]),
  );

  async function handleDeleteSurvey(survey: SurveySummary) {
    const shouldDelete = window.confirm(
      `Slette spørreundersøkelsen "${survey.title}"? Dette sletter også alle svar og resultater permanent.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteSurvey.mutateAsync(survey.id);
    } catch {
      return;
    }
  }

  async function handleRepeatSurvey(survey: SurveySummary) {
    const shouldRepeat = window.confirm(
      `Lage en ny runde av "${survey.title}"? Spørsmål, seksjoner og innstillinger kopieres, men svarene blir ikke med.`,
    );

    if (!shouldRepeat) {
      return;
    }

    try {
      const repeatedSurveyId = await repeatSurveyOnce.mutateAsync(survey.id);
      navigate(routes.editSurvey(repeatedSurveyId));
    } catch {
      return;
    }
  }

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

      {isLoading ? (
        <Panel title="Laster skjemaer" subtitle="Henter dine skjemaer fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {deleteSurvey.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(deleteSurvey.error)}
        </div>
      ) : null}

      {repeatSurveyOnce.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(repeatSurveyOnce.error)}
        </div>
      ) : null}

      {!isLoading && !isError && surveys.length === 0 ? (
        <Panel
          title="Ingen skjemaer ennå"
          subtitle="Opprett det første utkastet og bygg videre derfra."
          action={
            <Link className="button button--primary" to={routes.newSurvey}>
              <Plus size={18} aria-hidden="true" />
              Nytt skjema
            </Link>
          }
        />
      ) : null}

      {!isLoading && !isError && surveys.length > 0 ? (
        <div className="stack">
          {surveys.map((survey) => (
            <Panel
              key={survey.id}
              title={survey.title}
              subtitle={formatSurveyMeta(survey)}
              action={
                <div className="inline-actions">
                  <Link
                    className="icon-button"
                    to={routes.editSurvey(survey.id)}
                    aria-label={`Rediger ${survey.title}`}
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </Link>
                  <Link
                    className="icon-button"
                    to={routes.results(survey.id)}
                    aria-label={`Se resultater for ${survey.title}`}
                  >
                    <BarChart3 size={20} aria-hidden="true" />
                  </Link>
                  <button
                    className="icon-button"
                    type="button"
                    disabled={repeatSurveyOnce.isPending || deleteSurvey.isPending}
                    title={`Repeter ${survey.title}`}
                    aria-label={`Repeter ${survey.title}`}
                    onClick={() => handleRepeatSurvey(survey)}
                  >
                    <CopyPlus size={18} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    disabled={deleteSurvey.isPending || repeatSurveyOnce.isPending}
                    aria-label={`Slett ${survey.title}`}
                    onClick={() => handleDeleteSurvey(survey)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              }
            >
              <div className="status-row">
                <span className={`status-pill status-pill--${survey.status}`}>
                  {statusLabel[survey.status]}
                </span>
                <span>{responseModeLabel[survey.responseMode]}</span>
                <span>{formatSurveyWorkspace(survey, workspaceNameById)}</span>
                <span>{formatUpdatedAt(survey.updatedAt)}</span>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const statusLabel = {
  draft: 'Utkast',
  published: 'Publisert',
  closed: 'Lukket',
} satisfies Record<SurveySummary['status'], string>;

const responseModeLabel = {
  anonymous: 'Anonyme svar',
  identified: 'Identifiserte svar',
} satisfies Record<SurveySummary['responseMode'], string>;

function formatSurveyMeta(survey: SurveySummary) {
  if (survey.startsAt && survey.endsAt) {
    return `${statusLabel[survey.status]} · ${formatDate(survey.startsAt)}-${formatDate(
      survey.endsAt,
    )}`;
  }

  if (survey.endsAt) {
    return `${statusLabel[survey.status]} · varer til ${formatDate(survey.endsAt)}`;
  }

  if (survey.startsAt) {
    return `${statusLabel[survey.status]} · starter ${formatDate(survey.startsAt)}`;
  }

  return `${statusLabel[survey.status]} · uten tidsavgrensning`;
}

function formatSurveyWorkspace(
  survey: SurveySummary,
  workspaceNameById: Map<string, string>,
) {
  if (!survey.workspaceId) {
    return 'Individuell';
  }

  return workspaceNameById.get(survey.workspaceId) ?? 'Arbeidsflate';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatUpdatedAt(value: string) {
  return `Oppdatert ${formatDate(value)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke hente skjemaer.';
}
