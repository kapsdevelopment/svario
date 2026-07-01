import {
  BarChart3,
  CopyPlus,
  Pencil,
  Plus,
  Trash2,
  TreePine,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useDeleteSurvey } from '../../../application/surveys/useDeleteSurvey';
import { useRepeatSurveyOnce } from '../../../application/surveys/useRepeatSurveyOnce';
import { useSurveyList } from '../../../application/surveys/useSurveyList';
import { useSurveyRetentionWarnings } from '../../../application/surveys/useSurveyRetentionWarnings';
import { useWorkspaceScope } from '../../../application/workspaces/WorkspaceScopeProvider';
import type {
  SurveyRetentionWarning,
  SurveySummary,
} from '../../../domain/surveys/survey';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Panel } from '../../shared/components/Panel';

export function SurveyListPage() {
  const workspaceScope = useWorkspaceScope();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: surveys = [], error, isError, isLoading } = useSurveyList();
  const focusTarget = getSurveyFocusTarget(location.search);
  const surveyIds = surveys.map((survey) => survey.id);
  const retentionWarningsQuery = useSurveyRetentionWarnings(surveyIds);
  const deleteSurvey = useDeleteSurvey();
  const repeatSurveyOnce = useRepeatSurveyOnce();
  const [surveyToDelete, setSurveyToDelete] = useState<SurveySummary | null>(
    null,
  );
  const [surveyToRepeat, setSurveyToRepeat] = useState<SurveySummary | null>(
    null,
  );
  const workspaceNameById = new Map(
    workspaceScope.workspaces.map((workspace) => [workspace.id, workspace.name]),
  );
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

  useEffect(() => {
    if (isLoading || isError || !focusTarget) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-survey-focus="${focusTarget}"]`,
      );

      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [focusTarget, isError, isLoading, surveys.length]);

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
          {getUserFacingErrorMessage(error, 'Kunne ikke hente skjemaer.')}
        </div>
      ) : null}

      {deleteSurvey.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getUserFacingErrorMessage(
            deleteSurvey.error,
            'Kunne ikke slette skjemaet.',
          )}
        </div>
      ) : null}

      {repeatSurveyOnce.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getUserFacingErrorMessage(
            repeatSurveyOnce.error,
            'Kunne ikke repetere skjemaet.',
          )}
        </div>
      ) : null}

      {retentionWarningsQuery.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getUserFacingErrorMessage(
            retentionWarningsQuery.error,
            'Kunne ikke hente varsler om automatisk sletting.',
          )}
        </div>
      ) : null}

      {!isLoading && !isError && surveys.length === 0 ? (
        <Panel
          title="Ingen skjemaer ennå"
          subtitle={getEmptySurveyListSubtitle(workspaceScope)}
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
          <SurveyGroup
            title={getSurveyScopeTitle(workspaceScope)}
            subtitle={getSurveyScopeSubtitle(workspaceScope)}
            count={surveys.length}
          >
            {surveys.map((survey) => (
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
  const displayState = getSurveyDisplayState(survey);
  const isLive = displayState === 'active';
  const primaryRoute = getPrimarySurveyRoute(survey);
  const primaryActionLabel =
    survey.status === 'draft'
      ? `Rediger ${survey.title}`
      : `Se resultater for ${survey.title}`;

  return (
    <div
      className="survey-list-card-anchor scroll-anchor"
      data-survey-focus={displayState}
      tabIndex={-1}
    >
      <Panel
        className={`survey-list-card survey-list-card--${displayState}`}
        title={survey.title}
        subtitle={formatSurveyMeta(survey, displayState)}
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
        <Link
          className="survey-list-card__primary-link"
          to={primaryRoute}
          aria-label={primaryActionLabel}
        />
        <div className="status-row">
          <span className={`status-pill status-pill--${displayState}`}>
            {displayStateLabel[displayState]}
            {isLive ? (
              <span
                className="live-pine-indicator live-pine-indicator--status"
                aria-label="Live og pågår"
                title="Live og pågår"
              >
                <TreePine size={15} aria-hidden="true" />
              </span>
            ) : null}
          </span>
          <span className="status-pill status-pill--meta">
            {responseModeLabel[survey.responseMode]}
          </span>
          <span className="status-pill status-pill--meta">
            {formatSurveyWorkspace(survey, workspaceNameById)}
          </span>
          <span className="status-pill status-pill--meta">
            {formatUpdatedAt(survey.updatedAt)}
          </span>
        </div>
      </Panel>
    </div>
  );
}

function formatSurveyCount(count: number) {
  return `${count} ${count === 1 ? 'skjema' : 'skjemaer'}`;
}

function getSurveyScopeTitle({
  hasWorkspaceChoices,
  scope,
  workspaceLabel,
}: ReturnType<typeof useWorkspaceScope>) {
  if (!hasWorkspaceChoices) {
    return 'Mine skjemaer';
  }

  return scope.type === 'personal'
    ? 'Mine personlige skjemaer'
    : workspaceLabel;
}

function getSurveyScopeSubtitle(workspaceScope: ReturnType<typeof useWorkspaceScope>) {
  const scopeDescription = getWorkspaceScopeDescription(workspaceScope);

  return scopeDescription
    ? `Skjemaer ${scopeDescription}.`
    : 'Dine skjemaer og utkast.';
}

function getEmptySurveyListSubtitle(
  workspaceScope: ReturnType<typeof useWorkspaceScope>,
) {
  const scopeDescription = getWorkspaceScopeDescription(workspaceScope);

  return scopeDescription
    ? `Opprett det første utkastet ${scopeDescription}.`
    : 'Opprett det første utkastet og bygg videre derfra.';
}

function getWorkspaceScopeDescription({
  hasWorkspaceChoices,
  scope,
  workspaceLabel,
}: ReturnType<typeof useWorkspaceScope>) {
  if (!hasWorkspaceChoices) {
    return '';
  }

  return scope.type === 'personal'
    ? 'på din personlige konto'
    : `i ${workspaceLabel}`;
}

function toSurveyGroupHeadingId(title: string) {
  return `survey-group-${title.toLowerCase().replaceAll(' ', '-')}`;
}

type SurveyDisplayState = 'draft' | 'scheduled' | 'active' | 'finished' | 'closed';
type SurveyFocusTarget = Extract<SurveyDisplayState, 'active' | 'draft'>;

function getPrimarySurveyRoute(survey: SurveySummary) {
  return survey.status === 'draft'
    ? routes.editSurvey(survey.id)
    : routes.results(survey.id);
}

function getSurveyFocusTarget(search: string): SurveyFocusTarget | null {
  const focus = new URLSearchParams(search).get('focus');

  return focus === 'active' || focus === 'draft' ? focus : null;
}

const statusLabel = {
  draft: 'Utkast',
  published: 'Publisert',
  closed: 'Lukket',
} satisfies Record<SurveySummary['status'], string>;

const displayStateLabel = {
  draft: 'Utkast',
  scheduled: 'Planlagt',
  active: 'Aktiv',
  finished: 'Ferdig',
  closed: 'Lukket',
} satisfies Record<SurveyDisplayState, string>;

const responseModeLabel = {
  anonymous: 'Anonyme svar',
  identified: 'Identifiserte svar',
} satisfies Record<SurveySummary['responseMode'], string>;

function getSurveyDisplayState(survey: SurveySummary): SurveyDisplayState {
  if (survey.status === 'draft') {
    return 'draft';
  }

  if (survey.status === 'closed') {
    return 'closed';
  }

  const now = Date.now();
  const endsAt = survey.endsAt ? new Date(survey.endsAt).getTime() : null;
  const startsAt = survey.startsAt ? new Date(survey.startsAt).getTime() : null;

  if (endsAt !== null && endsAt <= now) {
    return 'finished';
  }

  if (startsAt !== null && startsAt > now) {
    return 'scheduled';
  }

  return 'active';
}

function formatSurveyMeta(
  survey: SurveySummary,
  displayState = getSurveyDisplayState(survey),
) {
  if (displayState === 'active') {
    if (survey.endsAt) {
      return `Aktiv · slutter ${formatDate(survey.endsAt)}`;
    }

    if (survey.startsAt) {
      return `Aktiv · startet ${formatDate(survey.startsAt)}`;
    }

    return 'Aktiv · uten tidsavgrensning';
  }

  if (displayState === 'scheduled' && survey.startsAt) {
    return `Planlagt · starter ${formatDate(survey.startsAt)}`;
  }

  if (displayState === 'finished' && survey.endsAt) {
    return `Ferdig · sluttet ${formatDate(survey.endsAt)}`;
  }

  if (displayState === 'closed') {
    if (survey.endsAt) {
      return `Lukket · sluttet ${formatDate(survey.endsAt)}`;
    }

    return 'Lukket · ikke aktiv';
  }

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
