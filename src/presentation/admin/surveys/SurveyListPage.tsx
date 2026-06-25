import { BarChart3, CopyPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useDeleteSurvey } from '../../../application/surveys/useDeleteSurvey';
import { useRepeatSurveyOnce } from '../../../application/surveys/useRepeatSurveyOnce';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import { useSurveyRetentionWarnings } from '../../../application/surveys/useSurveyRetentionWarnings';
import { useWorkspaces } from '../../../application/workspaces/useWorkspaces';
import type {
  SurveyRetentionWarning,
  SurveySummary,
} from '../../../domain/surveys/survey';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Panel } from '../../shared/components/Panel';

export function SurveyListPage() {
  const { account } = useAuth();
  const navigate = useNavigate();
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();
  const surveyIds = surveys.map((survey) => survey.id);
  const retentionWarningsQuery = useSurveyRetentionWarnings(surveyIds);
  const { data: workspaces = [] } = useWorkspaces(account?.id);
  const deleteSurvey = useDeleteSurvey();
  const repeatSurveyOnce = useRepeatSurveyOnce();
  const [surveyToDelete, setSurveyToDelete] = useState<SurveySummary | null>(
    null,
  );
  const [surveyToRepeat, setSurveyToRepeat] = useState<SurveySummary | null>(
    null,
  );
  const workspaceNameById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.name]),
  );
  const individualSurveys = surveys.filter((survey) => !survey.workspaceId);
  const workspaceSurveys = surveys.filter((survey) => survey.workspaceId);
  const surveyById = new Map(surveys.map((survey) => [survey.id, survey]));
  const retentionWarningItems = (retentionWarningsQuery.data ?? [])
    .map((warning) => {
      const survey = surveyById.get(warning.surveyId);
      return survey ? { survey, warning } : null;
    })
    .filter(
      (
        item,
      ): item is {
        survey: SurveySummary;
        warning: SurveyRetentionWarning;
      } => item !== null,
    );

  function handleDeleteSurvey(survey: SurveySummary) {
    setSurveyToDelete(survey);
  }

  async function confirmDeleteSurvey() {
    if (!surveyToDelete) {
      return;
    }

    try {
      await deleteSurvey.mutateAsync(surveyToDelete.id);
    } catch {
      return;
    } finally {
      setSurveyToDelete(null);
    }
  }

  function handleRepeatSurvey(survey: SurveySummary) {
    setSurveyToRepeat(survey);
  }

  async function confirmRepeatSurvey() {
    if (!surveyToRepeat) {
      return;
    }

    try {
      const repeatedSurveyId = await repeatSurveyOnce.mutateAsync(
        surveyToRepeat.id,
      );
      setSurveyToRepeat(null);
      navigate(routes.editSurvey(repeatedSurveyId));
    } catch {
      return;
    } finally {
      setSurveyToRepeat(null);
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

      {retentionWarningsQuery.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(
            retentionWarningsQuery.error,
            'Kunne ikke hente varsler om automatisk sletting.',
          )}
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

      {!isLoading &&
      !isError &&
      !retentionWarningsQuery.isLoading &&
      retentionWarningItems.length > 0 ? (
        <Panel
          title="Svar som slettes snart"
          subtitle={formatRetentionWarningPanelSubtitle(retentionWarningItems)}
        >
          <div className="retention-warning-list">
            {retentionWarningItems.map(({ survey, warning }) => (
              <div className="retention-warning-row" key={survey.id}>
                <div className="retention-warning-row__content">
                  <strong>{survey.title}</strong>
                  <p>{formatRetentionWarning(warning)}</p>
                </div>
                <Link
                  className="button button--secondary"
                  to={routes.editSurveyPrivacy(survey.id)}
                >
                  <Pencil size={18} aria-hidden="true" />
                  Vurder lagringstid
                </Link>
              </div>
            ))}
          </div>
          <p className="retention-warning-note">
            Når du forlenger lagringstiden, bekrefter du at du har vurdert at
            svarene fortsatt er nødvendige for formålet.
          </p>
        </Panel>
      ) : null}

      {!isLoading && !isError && surveys.length > 0 ? (
        <div className="survey-group-list">
          {individualSurveys.length > 0 ? (
            <SurveyGroup
              title="Mine individuelle skjemaer"
              subtitle="Skjemaer som ligger på din personlige konto."
              count={individualSurveys.length}
            >
              {individualSurveys.map((survey) => (
                <SurveyListCard
                  key={survey.id}
                  survey={survey}
                  workspaceNameById={workspaceNameById}
                  isRepeatPending={repeatSurveyOnce.isPending}
                  isDeletePending={deleteSurvey.isPending}
                  onRepeat={handleRepeatSurvey}
                  onDelete={handleDeleteSurvey}
                />
              ))}
            </SurveyGroup>
          ) : null}

          {workspaceSurveys.length > 0 ? (
            <SurveyGroup
              title="Team og organisasjon"
              subtitle="Skjemaer tilhørende organisasjon eller team"
              count={workspaceSurveys.length}
            >
              {workspaceSurveys.map((survey) => (
                <SurveyListCard
                  key={survey.id}
                  survey={survey}
                  workspaceNameById={workspaceNameById}
                  isRepeatPending={repeatSurveyOnce.isPending}
                  isDeletePending={deleteSurvey.isPending}
                  onRepeat={handleRepeatSurvey}
                  onDelete={handleDeleteSurvey}
                />
              ))}
            </SurveyGroup>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={surveyToRepeat !== null}
        title="Lag ny runde?"
        description={`Spørsmål, seksjoner og innstillinger kopieres fra "${
          surveyToRepeat?.title ?? ''
        }", men svarene blir ikke med.`}
        confirmLabel="Lag ny runde"
        isPending={repeatSurveyOnce.isPending}
        onCancel={() => setSurveyToRepeat(null)}
        onConfirm={confirmRepeatSurvey}
      />

      <ConfirmDialog
        open={surveyToDelete !== null}
        title="Slette spørreundersøkelsen?"
        description={`Dette sletter "${
          surveyToDelete?.title ?? ''
        }", alle svar og resultater permanent.`}
        confirmLabel="Slett permanent"
        isPending={deleteSurvey.isPending}
        variant="danger"
        onCancel={() => setSurveyToDelete(null)}
        onConfirm={confirmDeleteSurvey}
      />
    </div>
  );
}

type SurveyGroupProps = {
  title: string;
  subtitle: string;
  count: number;
  children: ReactNode;
};

function SurveyGroup({ title, subtitle, count, children }: SurveyGroupProps) {
  return (
    <section className="survey-group" aria-labelledby={toSurveyGroupHeadingId(title)}>
      <div className="survey-group__header">
        <div>
          <h2 id={toSurveyGroupHeadingId(title)}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="survey-group__count">{formatSurveyCount(count)}</span>
      </div>
      <div className="survey-group__items">{children}</div>
    </section>
  );
}

type SurveyListCardProps = {
  survey: SurveySummary;
  workspaceNameById: Map<string, string>;
  isRepeatPending: boolean;
  isDeletePending: boolean;
  onRepeat: (survey: SurveySummary) => void;
  onDelete: (survey: SurveySummary) => void;
};

function SurveyListCard({
  survey,
  workspaceNameById,
  isRepeatPending,
  isDeletePending,
  onRepeat,
  onDelete,
}: SurveyListCardProps) {
  return (
    <Panel
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
            disabled={isRepeatPending || isDeletePending}
            title={`Repeter ${survey.title}`}
            aria-label={`Repeter ${survey.title}`}
            onClick={() => onRepeat(survey)}
          >
            <CopyPlus size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button icon-button--danger"
            type="button"
            disabled={isDeletePending || isRepeatPending}
            aria-label={`Slett ${survey.title}`}
            onClick={() => onDelete(survey)}
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
  );
}

function formatSurveyCount(count: number) {
  return `${count} ${count === 1 ? 'skjema' : 'skjemaer'}`;
}

function toSurveyGroupHeadingId(title: string) {
  return `survey-group-${title.toLowerCase().replaceAll(' ', '-')}`;
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

function formatRetentionWarningPanelSubtitle(
  items: Array<{ warning: SurveyRetentionWarning }>,
) {
  const surveyCount = items.length;
  const responseCount = items.reduce(
    (sum, item) => sum + item.warning.responseCountDueSoon,
    0,
  );

  return `${responseCount} svar på ${surveyCount} ${
    surveyCount === 1 ? 'skjema' : 'skjemaer'
  }`;
}

function formatRetentionWarning(warning: SurveyRetentionWarning) {
  const responseLabel =
    warning.responseCountDueSoon === 1
      ? '1 svar'
      : `${warning.responseCountDueSoon} svar`;

  return `${responseLabel} slettes ${formatRetentionDueAt(
    warning.earliestRetentionDueAt,
  )}.`;
}

function formatRetentionDueAt(value: string) {
  const dueAt = new Date(value);
  const daysUntilDue = Math.ceil(
    (dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  const formattedDate = formatDate(value);

  if (daysUntilDue < 0) {
    return `forfalt ${formattedDate}`;
  }

  if (daysUntilDue === 0) {
    return `i dag (${formattedDate})`;
  }

  if (daysUntilDue === 1) {
    return `i morgen (${formattedDate})`;
  }

  return `om ${daysUntilDue} dager (${formattedDate})`;
}

function getErrorMessage(
  error: unknown,
  fallback = 'Kunne ikke hente skjemaer.',
) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
