import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Gauge,
  GripVertical,
  Layers2,
  ListChecks,
  LockKeyhole,
  Plus,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Type,
  UsersRound,
} from 'lucide-react';
import {
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { getUserFacingErrorMessage as getErrorMessage } from '../../../application/errors/userFacingError';
import { useMyProfile } from '../../../application/profiles/useMyProfile';
import { useAddSurveyQuestion } from '../../../application/surveys/useAddSurveyQuestion';
import { useAddSurveySection } from '../../../application/surveys/useAddSurveySection';
import { useDeleteSurveyQuestion } from '../../../application/surveys/useDeleteSurveyQuestion';
import { useDeleteSurveySection } from '../../../application/surveys/useDeleteSurveySection';
import { usePublishSurvey } from '../../../application/surveys/usePublishSurvey';
import { useReorderSurveyQuestions } from '../../../application/surveys/useReorderSurveyQuestions';
import { useSurveyEditor } from '../../../application/surveys/useSurveyEditor';
import { useUpdateSurveyBasicInfo } from '../../../application/surveys/useUpdateSurveyBasicInfo';
import { useUpdateSurveyPrivacySettings } from '../../../application/surveys/useUpdateSurveyPrivacySettings';
import { useUpdateSurveyVisibility } from '../../../application/surveys/useUpdateSurveyVisibility';
import { useWorkspaces } from '../../../application/workspaces/useWorkspaces';
import {
  questionScaleDefaults,
  questionScaleLimits,
  type SurveyLegalBasis,
  type SurveyPrivacySettings,
  type QuestionScaleVariant,
  type QuestionType,
  type SurveyEditor,
  type SurveyQuestion,
  type SurveySection,
  type SurveySummary,
  type SurveyVisibility,
} from '../../../domain/surveys/survey';
import type { WorkspaceWithMembership } from '../../../domain/workspaces/workspace';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Panel } from '../../shared/components/Panel';

const questionTypeLabels = {
  multiple_choice: 'Flervalg',
  free_text: 'Fritekst',
  likert_scale: 'Skala',
} satisfies Record<QuestionType, string>;

const scalePresets = [
  { label: 'Likert 1-5', min: 1, max: 5, variant: 'buttons' },
  { label: 'Likert 1-7', min: 1, max: 7, variant: 'buttons' },
  { label: 'Skala 1-4', min: 1, max: 4, variant: 'buttons' },
  { label: 'Stjerner 1-5', min: 1, max: 5, variant: 'stars' },
  { label: 'Net Promoter Score 0-10', min: 0, max: 10, variant: 'nps' },
] as const;

const legalBasisLabel = {
  consent: 'Samtykke',
  legitimate_interests: 'Berettiget interesse',
  contract: 'Avtale',
  legal_obligation: 'Rettslig plikt',
  public_task: 'Allmenn interesse / offentlig myndighet',
  other: 'Annet',
} satisfies Record<SurveyLegalBasis, string>;

const legalBasisGuidanceOverview = {
  label: 'Datatilsynet',
  title: 'Les mer hos Datatilsynet',
  url: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/',
} as const;

const legalBasisGuidance = {
  consent: {
    label: 'Datatilsynet',
    title: 'Les mer om samtykke hos Datatilsynet',
    url: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/samtykke/',
  },
  legitimate_interests: {
    label: 'Datatilsynet',
    title: 'Les mer om interesseavveiing hos Datatilsynet',
    url: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/nodvendig-for-a-ivareta-legitime-interesser---interesseavveiing/',
  },
  contract: {
    label: 'Datatilsynet',
    title: 'Les mer om avtale som behandlingsgrunnlag hos Datatilsynet',
    url: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/nodvendig-for-a-oppfylle-en-avtale/',
  },
  legal_obligation: {
    label: 'Datatilsynet',
    title: 'Les mer om rettslig plikt hos Datatilsynet',
    url: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/nodvendig-for-a-oppfylle-en-rettslig-plikt/',
  },
  public_task: {
    label: 'Datatilsynet',
    title:
      'Les mer om allmenn interesse eller offentlig myndighet hos Datatilsynet',
    url: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/om-behandlingsgrunnlag/nodvendig-for-a-utfore-en-oppgave/',
  },
  other: legalBasisGuidanceOverview,
} satisfies Record<
  SurveyLegalBasis,
  { label: string; title: string; url: string }
>;

type PrivacySurveyKind =
  | 'customer_feedback'
  | 'employee_survey'
  | 'student_project'
  | 'event_registration'
  | 'other';

type PersonalDataMode = 'none' | 'personal_data';

const privacySurveyKindOptions = [
  {
    value: 'student_project',
    label: 'Student-/forskningsprosjekt',
    description:
      'Passer når svarene brukes i en oppgave, studie eller analyseprosjekt.',
  },
  {
    value: 'customer_feedback',
    label: 'Kundetilbakemelding',
    description:
      'Passer for evaluering av tjenester, produkter eller kundeopplevelse.',
  },
  {
    value: 'employee_survey',
    label: 'Medarbeiderundersøkelse',
    description:
      'Passer for puls, trivsel eller intern forbedring i en virksomhet.',
  },
  {
    value: 'event_registration',
    label: 'Arrangement/påmelding',
    description:
      'Passer når svarene trengs for å administrere deltakelse eller oppfølging.',
  },
  {
    value: 'other',
    label: 'Annet',
    description:
      'Bruk egne formuleringer hvis undersøkelsen ikke passer i kategoriene.',
  },
] as const satisfies ReadonlyArray<{
  value: PrivacySurveyKind;
  label: string;
  description: string;
}>;

const personalDataModeOptions = [
  {
    value: 'none',
    label: 'Nei, den er anonym',
    description:
      'Bruk når du ikke ber om navn, e-post eller fritekst som kan identifisere noen.',
  },
  {
    value: 'personal_data',
    label: 'Ja, navn/e-post/fritekst eller lignende',
    description:
      'Bruk når svarene kan inneholde opplysninger som kan identifisere respondenten.',
  },
] as const satisfies ReadonlyArray<{
  value: PersonalDataMode;
  label: string;
  description: string;
}>;

const retentionPresetOptions = [
  { label: '30 dager', value: 30 },
  { label: '90 dager', value: 90 },
  { label: '6 måneder', value: 180 },
  { label: '12 måneder', value: 365 },
  { label: '24 måneder', value: 730 },
] as const;
const durationPresets = [
  { label: '24 timer', days: 1 },
  { label: '1 uke', days: 7 },
  { label: '2 uker', days: 14 },
  { label: '3 uker', days: 21 },
  { label: '1 mnd', months: 1 },
] as const;

const editorAutosaveDelayMs = 600;
const editorDraftVersion = 1;
const defaultOptionText = 'Ja\nNei';

type SurveyEditorLocalDraft = {
  version: typeof editorDraftVersion;
  surveyId: string;
  savedAt: number;
  basic: {
    title: string;
    description: string;
    responseMode: SurveySummary['responseMode'];
    startsAt: string;
    endsAt: string;
    visibility: SurveyVisibility;
  };
  section: {
    title: string;
    description: string;
  };
  question: {
    type: QuestionType;
    sectionId: string | null;
    prompt: string;
    description: string;
    isRequired: boolean;
    allowMultiple: boolean;
    optionText: string;
    scaleMin: number;
    scaleMax: number;
    scaleVariant: QuestionScaleVariant;
  };
};

export function SurveyEditorPage() {
  const { surveyId } = useParams();
  const location = useLocation();
  const { data: survey, error, isError, isLoading } = useSurveyEditor(surveyId);

  useEffect(() => {
    if (!survey || location.hash !== '#privacy') {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById('privacy')?.scrollIntoView({
        block: 'start',
      });
    });
  }, [location.hash, survey]);

  if (!surveyId) {
    return (
      <div className="page">
        <div className="form-alert form-alert--error" role="alert">
          Mangler skjema-id.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Skjemabygger</p>
          <h1>{survey?.title ?? 'Rediger skjema'}</h1>
        </div>
        <Link className="button button--secondary" to={routes.surveys}>
          <ArrowLeft size={18} aria-hidden="true" />
          Skjemaer
        </Link>
      </header>

      {isLoading ? (
        <Panel title="Laster skjema" subtitle="Henter struktur fra Supabase." />
      ) : null}

      {isError ? (
        <div className="form-alert form-alert--error" role="alert">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {survey ? <SurveyEditorContent survey={survey} /> : null}
    </div>
  );
}

function SurveyEditorContent({ survey }: { survey: SurveyEditor }) {
  const addSection = useAddSurveySection(survey.id);
  const addQuestion = useAddSurveyQuestion(survey.id);
  const deleteSection = useDeleteSurveySection(survey.id);
  const deleteQuestion = useDeleteSurveyQuestion(survey.id);
  const reorderQuestions = useReorderSurveyQuestions(survey.id);
  const publishSurvey = usePublishSurvey(survey.id);
  const updateBasicInfo = useUpdateSurveyBasicInfo(survey.id);
  const updatePrivacySettings = useUpdateSurveyPrivacySettings(survey.id);
  const updateVisibility = useUpdateSurveyVisibility(survey.id);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] =
    useState<SurveyQuestion | null>(null);
  const [sectionToDelete, setSectionToDelete] =
    useState<SurveySection | null>(null);

  const [basicTitle, setBasicTitle] = useState(survey.title);
  const [basicDescription, setBasicDescription] = useState(
    survey.description ?? '',
  );
  const [basicResponseMode, setBasicResponseMode] =
    useState(survey.responseMode);
  const [basicStartsAt, setBasicStartsAt] = useState(
    toDateTimeInputValue(survey.startsAt),
  );
  const [basicEndsAt, setBasicEndsAt] = useState(
    toDateTimeInputValue(survey.endsAt),
  );
  const [basicVisibility, setBasicVisibility] = useState(survey.visibility);
  const [basicValidationError, setBasicValidationError] = useState<
    string | null
  >(null);
  const [basicMessage, setBasicMessage] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionToolsOpen, setSectionToolsOpen] = useState(
    survey.sections.length > 0,
  );
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [optionText, setOptionText] = useState(defaultOptionText);
  const [scaleMin, setScaleMin] = useState<number>(questionScaleDefaults.min);
  const [scaleMax, setScaleMax] = useState<number>(questionScaleDefaults.max);
  const [scaleVariant, setScaleVariant] =
    useState<QuestionScaleVariant>('buttons');
  const [sectionValidationError, setSectionValidationError] = useState<
    string | null
  >(null);
  const [questionValidationError, setQuestionValidationError] = useState<
    string | null
  >(null);
  const [publishValidationError, setPublishValidationError] = useState<
    string | null
  >(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [draggedQuestion, setDraggedQuestion] = useState<{
    questionId: string;
    sectionId: string | null;
  } | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(
    null,
  );
  const [reorderError, setReorderError] = useState<string | null>(null);

  const currentStatus = publishSurvey.data?.status ?? survey.status;
  const publishedAt = publishSurvey.data?.publishedAt ?? survey.publishedAt;
  const isDraft = currentStatus === 'draft';
  const isPublished = currentStatus === 'published';
  const structureLockMessage = getStructureLockMessage(
    currentStatus,
    survey.responseCount,
  );
  const canEditStructure = structureLockMessage === null;
  const canReorderQuestions = canEditStructure && !reorderQuestions.isPending;
  const privacyIssues = getPrivacyCompletionIssues(survey);
  const canPublish =
    isDraft && survey.questions.length > 0 && privacyIssues.length === 0;
  const shareUrl = useMemo(() => createShareUrl(survey.slug), [survey.slug]);
  const selectedSectionId = survey.sections.some((section) => section.id === sectionId)
    ? sectionId
    : null;
  const questionGroups = useMemo(
    () => groupQuestionsBySection(survey.sections, survey.questions),
    [survey.questions, survey.sections],
  );
  const optionLabels = useMemo(
    () => optionText.split('\n').map((line) => line.trim()).filter(Boolean),
    [optionText],
  );
  const selectedScalePreset = useMemo(
    () =>
      scalePresets.find(
        (preset) =>
          preset.min === scaleMin &&
          preset.max === scaleMax &&
          preset.variant === scaleVariant,
      ),
    [scaleMax, scaleMin, scaleVariant],
  );

  useEffect(() => {
    setBasicTitle(survey.title);
    setBasicDescription(survey.description ?? '');
    setBasicResponseMode(survey.responseMode);
    setBasicStartsAt(toDateTimeInputValue(survey.startsAt));
    setBasicEndsAt(toDateTimeInputValue(survey.endsAt));
    setBasicVisibility(survey.visibility);
  }, [
    survey.description,
    survey.endsAt,
    survey.responseMode,
    survey.startsAt,
    survey.title,
    survey.visibility,
  ]);

  useEffect(() => {
    if (survey.sections.length > 0) {
      setSectionToolsOpen(true);
    }
  }, [survey.sections.length]);

  const localDraftStorageKey = useMemo(
    () => getSurveyEditorLocalDraftStorageKey(survey.id),
    [survey.id],
  );
  const [localDraftHydratedKey, setLocalDraftHydratedKey] = useState<
    string | null
  >(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<number | null>(
    null,
  );
  const [localDraftRestoredAt, setLocalDraftRestoredAt] = useState<
    number | null
  >(null);
  const lastLocalDraftFingerprint = useRef<string | null>(null);
  const currentLocalDraft = useMemo<SurveyEditorLocalDraft>(
    () => ({
      version: editorDraftVersion,
      surveyId: survey.id,
      savedAt: 0,
      basic: {
        title: basicTitle,
        description: basicDescription,
        responseMode: basicResponseMode,
        startsAt: basicStartsAt,
        endsAt: basicEndsAt,
        visibility: basicVisibility,
      },
      section: {
        title: sectionTitle,
        description: sectionDescription,
      },
      question: {
        type,
        sectionId: selectedSectionId,
        prompt,
        description,
        isRequired,
        allowMultiple,
        optionText,
        scaleMin,
        scaleMax,
        scaleVariant,
      },
    }),
    [
      allowMultiple,
      basicDescription,
      basicEndsAt,
      basicResponseMode,
      basicStartsAt,
      basicTitle,
      basicVisibility,
      description,
      isRequired,
      optionText,
      prompt,
      scaleMax,
      scaleMin,
      scaleVariant,
      sectionDescription,
      sectionTitle,
      selectedSectionId,
      survey.id,
      type,
    ],
  );
  const currentLocalDraftHasContent = useMemo(
    () => isSurveyEditorLocalDraftMeaningful(currentLocalDraft, survey),
    [currentLocalDraft, survey],
  );
  const currentLocalDraftFingerprint = useMemo(
    () => getSurveyEditorLocalDraftFingerprint(currentLocalDraft),
    [currentLocalDraft],
  );

  useEffect(() => {
    const storedDraft = readSurveyEditorLocalDraft(
      localDraftStorageKey,
      survey.id,
    );

    if (storedDraft) {
      setBasicTitle(storedDraft.basic.title);
      setBasicDescription(storedDraft.basic.description);
      setBasicResponseMode(storedDraft.basic.responseMode);
      setBasicStartsAt(storedDraft.basic.startsAt);
      setBasicEndsAt(storedDraft.basic.endsAt);
      setBasicVisibility(storedDraft.basic.visibility);
      setSectionTitle(storedDraft.section.title);
      setSectionDescription(storedDraft.section.description);
      if (
        storedDraft.section.title.trim().length > 0 ||
        storedDraft.section.description.trim().length > 0
      ) {
        setSectionToolsOpen(true);
      }
      setType(storedDraft.question.type);
      setSectionId(storedDraft.question.sectionId);
      setPrompt(storedDraft.question.prompt);
      setDescription(storedDraft.question.description);
      setIsRequired(storedDraft.question.isRequired);
      setAllowMultiple(storedDraft.question.allowMultiple);
      setOptionText(storedDraft.question.optionText);
      setScaleMin(storedDraft.question.scaleMin);
      setScaleMax(storedDraft.question.scaleMax);
      setScaleVariant(storedDraft.question.scaleVariant);
      setLocalDraftSavedAt(storedDraft.savedAt);
      setLocalDraftRestoredAt(storedDraft.savedAt);
      lastLocalDraftFingerprint.current =
        getSurveyEditorLocalDraftFingerprint(storedDraft);
    } else {
      setLocalDraftSavedAt(null);
      setLocalDraftRestoredAt(null);
      lastLocalDraftFingerprint.current = null;
    }

    setLocalDraftHydratedKey(localDraftStorageKey);
  }, [localDraftStorageKey, survey.id]);

  useEffect(() => {
    if (localDraftHydratedKey !== localDraftStorageKey) {
      return;
    }

    if (!currentLocalDraftHasContent) {
      removeSurveyEditorLocalDraft(localDraftStorageKey);
      lastLocalDraftFingerprint.current = null;
      setLocalDraftSavedAt(null);
      setLocalDraftRestoredAt(null);
      return;
    }

    if (currentLocalDraftFingerprint === lastLocalDraftFingerprint.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const savedAt = Date.now();

      writeSurveyEditorLocalDraft(localDraftStorageKey, {
        ...currentLocalDraft,
        savedAt,
      });
      lastLocalDraftFingerprint.current = currentLocalDraftFingerprint;
      setLocalDraftSavedAt(savedAt);
      setLocalDraftRestoredAt(null);
    }, editorAutosaveDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentLocalDraft,
    currentLocalDraftFingerprint,
    currentLocalDraftHasContent,
    localDraftHydratedKey,
    localDraftStorageKey,
  ]);

  useEffect(() => {
    if (localDraftHydratedKey !== localDraftStorageKey) {
      return;
    }

    function persistLocalDraftNow() {
      if (!currentLocalDraftHasContent) {
        removeSurveyEditorLocalDraft(localDraftStorageKey);
        return;
      }

      if (currentLocalDraftFingerprint === lastLocalDraftFingerprint.current) {
        return;
      }

      const savedAt = Date.now();

      writeSurveyEditorLocalDraft(localDraftStorageKey, {
        ...currentLocalDraft,
        savedAt,
      });
      lastLocalDraftFingerprint.current = currentLocalDraftFingerprint;
      setLocalDraftSavedAt(savedAt);
      setLocalDraftRestoredAt(null);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        persistLocalDraftNow();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', persistLocalDraftNow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', persistLocalDraftNow);
    };
  }, [
    currentLocalDraft,
    currentLocalDraftFingerprint,
    currentLocalDraftHasContent,
    localDraftHydratedKey,
    localDraftStorageKey,
  ]);

  async function handleVisibilityChange(nextVisibility: SurveyVisibility) {
    if (!survey.workspaceId || nextVisibility === basicVisibility) {
      return;
    }

    const previousVisibility = basicVisibility;
    setBasicValidationError(null);
    setBasicMessage(null);
    setBasicVisibility(nextVisibility);

    try {
      await updateVisibility.mutateAsync({
        surveyId: survey.id,
        visibility: nextVisibility,
      });
      setBasicMessage(
        nextVisibility === 'workspace'
          ? 'Skjemaet er synlig for alle i arbeidsflaten.'
          : 'Skjemaet er personlig i arbeidsflaten.',
      );
    } catch {
      setBasicVisibility(previousVisibility);
    }
  }

  async function handleSaveBasicInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBasicValidationError(null);
    setBasicMessage(null);

    const normalizedTitle = basicTitle.trim();

    if (!normalizedTitle) {
      setBasicValidationError('Skjemaet må ha en tittel.');
      return;
    }

    if (
      survey.responseCount > 0 &&
      basicResponseMode !== survey.responseMode
    ) {
      setBasicValidationError(
        'Svarmodus kan ikke endres etter at skjemaet har fått svar.',
      );
      return;
    }

    const normalizedStartsAt = toIsoDateTime(basicStartsAt);
    const normalizedEndsAt = toIsoDateTime(basicEndsAt);
    const shouldResetPrivacyToAnonymous =
      survey.responseMode === 'identified' &&
      basicResponseMode === 'anonymous' &&
      survey.privacySettings !== null;

    if (
      normalizedStartsAt &&
      normalizedEndsAt &&
      new Date(normalizedEndsAt) <= new Date(normalizedStartsAt)
    ) {
      setBasicValidationError('Slutttidspunkt må være etter starttidspunkt.');
      return;
    }

    try {
      await updateBasicInfo.mutateAsync({
        surveyId: survey.id,
        title: normalizedTitle,
        description: basicDescription,
        responseMode: basicResponseMode,
        startsAt: normalizedStartsAt,
        endsAt: normalizedEndsAt,
      });

      if (shouldResetPrivacyToAnonymous && survey.privacySettings) {
        await updatePrivacySettings.mutateAsync({
          surveyId: survey.id,
          enabled: false,
          personalDataExpected: false,
          controllerName: survey.privacySettings.controllerName,
          controllerContact: survey.privacySettings.controllerContact,
          purpose: survey.privacySettings.purpose,
          legalBasis: survey.privacySettings.legalBasis,
          legalBasisNote: survey.privacySettings.legalBasisNote,
          consentText: survey.privacySettings.consentText,
          retentionDays: survey.privacySettings.retentionDays,
          retentionAction: survey.privacySettings.retentionAction,
          respondentNotice: survey.privacySettings.respondentNotice,
          retentionChangeReason: null,
        });
      }

      setBasicMessage(
        shouldResetPrivacyToAnonymous
          ? 'Grunninfo er oppdatert. Personvern er satt til anonym.'
          : 'Grunninfo er oppdatert.',
      );
    } catch {
      if (shouldResetPrivacyToAnonymous) {
        setBasicValidationError(
          'Grunninfo kan være lagret, men personvernmodus kunne ikke settes til anonym. Prøv å lagre personvern manuelt.',
        );
      }
      return;
    }
  }

  function handleBasicDurationPreset(
    preset: (typeof durationPresets)[number],
  ) {
    setBasicValidationError(null);
    setBasicMessage(null);

    const startDate = parseDateTimeInputValue(basicStartsAt) ?? new Date();
    const endDate = addDuration(startDate, preset);

    setBasicStartsAt(formatDateTimeInputValue(startDate));
    setBasicEndsAt(formatDateTimeInputValue(endDate));
  }

  async function handleAddSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSectionValidationError(null);

    if (!canEditStructure) {
      setSectionValidationError(
        structureLockMessage ?? 'Skjemastrukturen kan ikke endres her.',
      );
      return;
    }

    if (!sectionTitle.trim()) {
      setSectionValidationError('Seksjonen må ha en tittel.');
      return;
    }

    try {
      await addSection.mutateAsync({
        surveyId: survey.id,
        title: sectionTitle,
        description: sectionDescription,
      });
    } catch {
      return;
    }

    setSectionTitle('');
    setSectionDescription('');
  }

  function handleScalePresetChange(value: string) {
    if (value === 'custom') {
      setScaleVariant('buttons');
      return;
    }

    const preset = scalePresets.find(
      (currentPreset) => getScalePresetValue(currentPreset) === value,
    );

    if (!preset) {
      return;
    }

    setScaleMin(preset.min);
    setScaleMax(preset.max);
    setScaleVariant(preset.variant);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuestionValidationError(null);

    if (!canEditStructure) {
      setQuestionValidationError(
        structureLockMessage ?? 'Skjemastrukturen kan ikke endres her.',
      );
      return;
    }

    if (!prompt.trim()) {
      setQuestionValidationError('Spørsmålet må ha en tekst.');
      return;
    }

    if (type === 'multiple_choice' && optionLabels.length < 2) {
      setQuestionValidationError(
        'Flervalgsspørsmål må ha minst to alternativer.',
      );
      return;
    }

    if (type === 'likert_scale') {
      const scaleError = getScaleValidationError(scaleMin, scaleMax);

      if (scaleError) {
        setQuestionValidationError(scaleError);
        return;
      }
    }

    try {
      await addQuestion.mutateAsync({
        surveyId: survey.id,
        sectionId: selectedSectionId,
        type,
        prompt,
        description,
        isRequired,
        allowMultiple,
        scaleMin: type === 'likert_scale' ? scaleMin : null,
        scaleMax: type === 'likert_scale' ? scaleMax : null,
        scaleVariant: type === 'likert_scale' ? scaleVariant : null,
        optionLabels,
      });
    } catch {
      return;
    }

    setPrompt('');
    setDescription('');
    setAllowMultiple(false);
    setOptionText(defaultOptionText);
    setScaleMin(questionScaleDefaults.min);
    setScaleMax(questionScaleDefaults.max);
    setScaleVariant('buttons');
  }

  async function handlePublish() {
    setPublishValidationError(null);
    setPublishMessage(null);

    if (!isDraft) {
      setPublishValidationError('Bare utkast kan publiseres her.');
      return;
    }

    if (survey.questions.length === 0) {
      setPublishValidationError(
        'Skjemaet må ha minst ett spørsmål før publisering.',
      );
      return;
    }

    if (privacyIssues.length > 0) {
      setPublishValidationError(privacyIssues[0]);
      return;
    }

    setPublishDialogOpen(true);
  }

  async function confirmPublishSurvey() {
    try {
      await publishSurvey.mutateAsync();
      setPublishMessage('Skjemaet er publisert. Lenken er aktiv.');
    } catch {
      return;
    } finally {
      setPublishDialogOpen(false);
    }
  }

  async function handleCopyShareUrl() {
    setPublishValidationError(null);
    setPublishMessage(null);

    if (!navigator.clipboard) {
      setPublishValidationError('Kopiering støttes ikke i denne nettleseren.');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setPublishMessage('Lenken er kopiert.');
    } catch {
      setPublishValidationError('Kunne ikke kopiere lenken automatisk.');
    }
  }

  function handleDelete(question: SurveyQuestion) {
    setQuestionToDelete(question);
  }

  function handleQuestionDragStart(
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) {
    if (!canReorderQuestions) {
      event.preventDefault();
      return;
    }

    setReorderError(null);
    setDraggedQuestion({
      questionId: question.id,
      sectionId: question.sectionId,
    });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', question.id);
  }

  function handleQuestionDragOver(
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) {
    if (
      !canReorderQuestions ||
      !draggedQuestion ||
      draggedQuestion.questionId === question.id ||
      draggedQuestion.sectionId !== question.sectionId
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverQuestionId(question.id);
  }

  function handleQuestionDragLeave(
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDragOverQuestionId((currentQuestionId) =>
      currentQuestionId === question.id ? null : currentQuestionId,
    );
  }

  async function handleQuestionDrop(
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) {
    event.preventDefault();
    const activeQuestion = draggedQuestion;
    setDraggedQuestion(null);
    setDragOverQuestionId(null);

    if (
      !canReorderQuestions ||
      !activeQuestion ||
      activeQuestion.questionId === question.id ||
      activeQuestion.sectionId !== question.sectionId
    ) {
      return;
    }

    const group = questionGroups.find((currentGroup) =>
      currentGroup.questions.some(
        (groupQuestion) => groupQuestion.id === question.id,
      ),
    );
    const questionIds =
      group?.questions.map((groupQuestion) => groupQuestion.id) ?? [];
    const fromIndex = questionIds.indexOf(activeQuestion.questionId);
    const toIndex = questionIds.indexOf(question.id);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    try {
      await reorderQuestions.mutateAsync({
        surveyId: survey.id,
        sectionId: question.sectionId,
        questionIds: moveArrayItem(questionIds, fromIndex, toIndex),
      });
    } catch {
      setReorderError('Kunne ikke endre rekkefølgen. Prøv igjen.');
    }
  }

  function handleQuestionDragEnd() {
    setDraggedQuestion(null);
    setDragOverQuestionId(null);
  }

  async function confirmDeleteQuestion() {
    if (!questionToDelete) {
      return;
    }

    try {
      await deleteQuestion.mutateAsync(questionToDelete.id);
    } catch {
      return;
    } finally {
      setQuestionToDelete(null);
    }
  }

  function handleDeleteSection(section: SurveySection) {
    setSectionToDelete(section);
  }

  async function confirmDeleteSection() {
    if (!sectionToDelete) {
      return;
    }

    try {
      await deleteSection.mutateAsync(sectionToDelete.id);
    } catch {
      return;
    } finally {
      setSectionToDelete(null);
    }
  }

  return (
    <>
      <Panel
        title="Grunninfo"
        subtitle={formatSurveyWindow(survey)}
        action={
          survey.workspaceId ? (
            <SurveyVisibilityToggle
              visibility={basicVisibility}
              isPending={updateVisibility.isPending}
              onChange={handleVisibilityChange}
            />
          ) : null
        }
      >
        <form className="basic-info-form" onSubmit={handleSaveBasicInfo}>
          <div className="basic-info-form__primary">
            <label>
              Tittel
              <input
                type="text"
                value={basicTitle}
                disabled={updateBasicInfo.isPending}
                onChange={(event) => setBasicTitle(event.target.value)}
              />
            </label>
            <label>
              Beskrivelse
              <textarea
                rows={4}
                value={basicDescription}
                disabled={updateBasicInfo.isPending}
                onChange={(event) => setBasicDescription(event.target.value)}
              />
            </label>
          </div>

          <div className="basic-info-form__secondary">
            <label>
              Besvarelser
              <select
                value={basicResponseMode}
                disabled={survey.responseCount > 0 || updateBasicInfo.isPending}
                onChange={(event) =>
                  setBasicResponseMode(
                    event.target.value as SurveySummary['responseMode'],
                  )
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
                value={basicStartsAt}
                disabled={updateBasicInfo.isPending}
                onChange={(event) => setBasicStartsAt(event.target.value)}
              />
            </label>
            <label>
              Slutter
              <input
                type="datetime-local"
                value={basicEndsAt}
                disabled={updateBasicInfo.isPending}
                onChange={(event) => setBasicEndsAt(event.target.value)}
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
                  disabled={updateBasicInfo.isPending}
                  key={preset.label}
                  onClick={() => handleBasicDurationPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {survey.responseCount > 0 ? (
            <div className="form-alert form-alert--info" role="status">
              Svarmodus er låst fordi skjemaet har innsendte svar.
            </div>
          ) : null}

          {basicValidationError ? (
            <div className="form-alert form-alert--error" role="alert">
              {basicValidationError}
            </div>
          ) : null}
          {updateBasicInfo.isError ? (
            <div className="form-alert form-alert--error" role="alert">
              {getErrorMessage(updateBasicInfo.error)}
            </div>
          ) : null}
          {updateVisibility.isError ? (
            <div className="form-alert form-alert--error" role="alert">
              {getErrorMessage(
                updateVisibility.error,
                'Kunne ikke oppdatere synlighet.',
              )}
            </div>
          ) : null}
          {basicMessage ? (
            <div className="form-alert form-alert--success" role="status">
              {basicMessage}
            </div>
          ) : null}

          <div className="basic-info-form__footer">
            <div className="status-row">
              <span className={`status-pill status-pill--${currentStatus}`}>
                {statusLabel[currentStatus]}
              </span>
              <span>{survey.slug}</span>
            </div>
            <button
              className="button button--secondary"
              type="submit"
              disabled={updateBasicInfo.isPending}
            >
              <Save size={18} aria-hidden="true" />
              {updateBasicInfo.isPending ? 'Lagrer...' : 'Lagre grunninfo'}
            </button>
          </div>
        </form>
      </Panel>

      {structureLockMessage ? (
        <div className="form-alert form-alert--info" role="status">
          {structureLockMessage}
        </div>
      ) : null}

      {localDraftSavedAt ? (
        <EditorAutosaveStatus
          restoredAt={localDraftRestoredAt}
          savedAt={localDraftSavedAt}
        />
      ) : null}

      <Panel
        title="Spørsmål"
        subtitle={
          survey.questions.length === 0
            ? 'Ingen spørsmål er lagt til ennå'
            : `${survey.questions.length} i rekkefølge`
        }
      >
        <div className="survey-builder-stack">
          <section className="builder-subsection">
            <div className="builder-subsection__header">
              <h3>Legg til spørsmål</h3>
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              <div
                className={
                  survey.sections.length > 0
                    ? 'form-grid'
                    : 'form-grid form-grid--two'
                }
              >
                <label>
                  Spørsmålstype
                  <select
                    value={type}
                    disabled={!canEditStructure || addQuestion.isPending}
                    onChange={(event) =>
                      setType(event.target.value as QuestionType)
                    }
                  >
                    <option value="multiple_choice">Flervalg</option>
                    <option value="free_text">Fritekst</option>
                    <option value="likert_scale">Skala/rating</option>
                  </select>
                </label>
                {survey.sections.length > 0 ? (
                  <label>
                    Seksjon
                    <select
                      value={selectedSectionId ?? 'none'}
                      disabled={!canEditStructure || addQuestion.isPending}
                      onChange={(event) =>
                        setSectionId(
                          event.target.value === 'none'
                            ? null
                            : event.target.value,
                        )
                      }
                    >
                      <option value="none">Uten seksjon</option>
                      {survey.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title ?? 'Uten tittel'}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  Spørsmål
                  <input
                    type="text"
                    value={prompt}
                    disabled={!canEditStructure || addQuestion.isPending}
                    placeholder="Hva bør vi prioritere neste kvartal?"
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </label>
              </div>
              <label>
                Beskrivelse
                <textarea
                  rows={3}
                  value={description}
                  disabled={!canEditStructure || addQuestion.isPending}
                  placeholder="Valgfri kontekst til respondenten"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              {type === 'multiple_choice' ? (
                <label>
                  Alternativer
                  <textarea
                    rows={4}
                    value={optionText}
                    disabled={!canEditStructure || addQuestion.isPending}
                    onChange={(event) => setOptionText(event.target.value)}
                  />
                </label>
              ) : null}
              {type === 'likert_scale' ? (
                <div className="form-grid">
                  <label>
                    Hurtigvalg
                    <select
                      value={
                        selectedScalePreset
                          ? getScalePresetValue(selectedScalePreset)
                          : 'custom'
                      }
                      disabled={!canEditStructure || addQuestion.isPending}
                      onChange={(event) =>
                        handleScalePresetChange(event.target.value)
                      }
                    >
                      {scalePresets.map((preset) => (
                        <option
                          key={getScalePresetValue(preset)}
                          value={getScalePresetValue(preset)}
                        >
                          {preset.label}
                        </option>
                      ))}
                      <option value="custom">Egendefinert</option>
                    </select>
                  </label>
                  <label>
                    Fra
                    <input
                      type="number"
                      min={questionScaleLimits.min}
                      max={questionScaleLimits.max}
                      value={scaleMin}
                      disabled={
                        !canEditStructure ||
                        addQuestion.isPending ||
                        scaleVariant !== 'buttons'
                      }
                      onChange={(event) => {
                        setScaleVariant('buttons');
                        setScaleMin(
                          parseScaleInput(event.target.value, scaleMin),
                        );
                      }}
                    />
                  </label>
                  <label>
                    Til
                    <input
                      type="number"
                      min={questionScaleLimits.min}
                      max={questionScaleLimits.max}
                      value={scaleMax}
                      disabled={
                        !canEditStructure ||
                        addQuestion.isPending ||
                        scaleVariant !== 'buttons'
                      }
                      onChange={(event) => {
                        setScaleVariant('buttons');
                        setScaleMax(
                          parseScaleInput(event.target.value, scaleMax),
                        );
                      }}
                    />
                  </label>
                </div>
              ) : null}
              <div className="checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={isRequired}
                    disabled={!canEditStructure || addQuestion.isPending}
                    onChange={(event) => setIsRequired(event.target.checked)}
                  />
                  Påkrevd
                </label>
                {type === 'multiple_choice' ? (
                  <label>
                    <input
                      type="checkbox"
                      checked={allowMultiple}
                      disabled={!canEditStructure || addQuestion.isPending}
                      onChange={(event) => setAllowMultiple(event.target.checked)}
                    />
                    Flere valg
                  </label>
                ) : null}
              </div>
              {questionValidationError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {questionValidationError}
                </div>
              ) : null}
              {addQuestion.isError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {getErrorMessage(addQuestion.error)}
                </div>
              ) : null}
              {deleteQuestion.isError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {getErrorMessage(deleteQuestion.error)}
                </div>
              ) : null}
              <div className="form-actions">
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={!canEditStructure || addQuestion.isPending}
                >
                  <Plus size={18} aria-hidden="true" />
                  {addQuestion.isPending ? 'Legger til...' : 'Legg til spørsmål'}
                </button>
              </div>
            </form>
          </section>

          <section className="builder-subsection">
            <div className="builder-subsection__header">
              <h3>Oversikt</h3>
              <span>
                {survey.questions.length === 0
                  ? 'Tomt skjema'
                  : `${survey.questions.length} spørsmål`}
              </span>
            </div>

            <div className="question-list">
              {questionGroups.map((group) => (
                <section className="question-group" key={group.id}>
                  <div className="question-group__header">
                    <h3>{group.title}</h3>
                    {group.description ? <p>{group.description}</p> : null}
                  </div>
                  {group.questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      disabled={
                        !canEditStructure ||
                        deleteQuestion.isPending ||
                        reorderQuestions.isPending
                      }
                      canDrag={canReorderQuestions && group.questions.length > 1}
                      isDragging={draggedQuestion?.questionId === question.id}
                      isDragOver={dragOverQuestionId === question.id}
                      onDelete={handleDelete}
                      onDragStart={handleQuestionDragStart}
                      onDragOver={handleQuestionDragOver}
                      onDragLeave={handleQuestionDragLeave}
                      onDrop={handleQuestionDrop}
                      onDragEnd={handleQuestionDragEnd}
                    />
                  ))}
                  {group.questions.length === 0 ? (
                    <div className="question-group__empty">
                      Ingen spørsmål i denne seksjonen ennå.
                    </div>
                  ) : null}
                </section>
              ))}
              {survey.questions.length === 0 && survey.sections.length === 0 ? (
                <div className="empty-state">
                  <ListChecks size={28} aria-hidden="true" />
                  <p>Legg inn første spørsmål for å forme respondentflyten.</p>
                </div>
              ) : null}
              {reorderError ? (
                <p className="form-error" role="alert">
                  {reorderError}
                </p>
              ) : null}
            </div>

            <details
              className="optional-section-tools"
              open={sectionToolsOpen}
              onToggle={(event) => setSectionToolsOpen(event.currentTarget.open)}
            >
              <summary>
                <span className="optional-section-tools__label">
                  <Layers2 size={18} aria-hidden="true" />
                  Seksjoner
                </span>
                <span>
                  {survey.sections.length === 0
                    ? 'Valgfritt'
                    : `${survey.sections.length} seksjoner`}
                </span>
              </summary>

              <div className="optional-section-tools__content">
                <form className="form-stack" onSubmit={handleAddSection}>
                  <div className="form-grid form-grid--two">
                    <label>
                      Tittel
                      <input
                        type="text"
                        value={sectionTitle}
                        disabled={!canEditStructure || addSection.isPending}
                        placeholder="Om arbeidsmiljøet"
                        onChange={(event) => setSectionTitle(event.target.value)}
                      />
                    </label>
                    <label>
                      Beskrivelse
                      <input
                        type="text"
                        value={sectionDescription}
                        disabled={!canEditStructure || addSection.isPending}
                        placeholder="Kort intro til denne delen"
                        onChange={(event) =>
                          setSectionDescription(event.target.value)
                        }
                      />
                    </label>
                  </div>
                  {sectionValidationError ? (
                    <div className="form-alert form-alert--error" role="alert">
                      {sectionValidationError}
                    </div>
                  ) : null}
                  {addSection.isError ? (
                    <div className="form-alert form-alert--error" role="alert">
                      {getErrorMessage(addSection.error)}
                    </div>
                  ) : null}
                  {deleteSection.isError ? (
                    <div className="form-alert form-alert--error" role="alert">
                      {getErrorMessage(deleteSection.error)}
                    </div>
                  ) : null}
                  <div className="form-actions">
                    <button
                      className="button button--secondary"
                      type="submit"
                      disabled={!canEditStructure || addSection.isPending}
                    >
                      <Layers2 size={18} aria-hidden="true" />
                      {addSection.isPending ? 'Legger til...' : 'Legg til seksjon'}
                    </button>
                  </div>
                </form>

                {survey.sections.length > 0 ? (
                  <div className="section-list">
                    {survey.sections.map((section) => (
                      <article className="section-card" key={section.id}>
                        <div>
                          <h3>{section.title ?? 'Uten tittel'}</h3>
                          {section.description ? (
                            <p>{section.description}</p>
                          ) : null}
                        </div>
                        <button
                          className="icon-button"
                          type="button"
                          disabled={!canEditStructure || deleteSection.isPending}
                          aria-label={`Slett seksjonen ${
                            section.title ?? 'uten tittel'
                          }`}
                          onClick={() => handleDeleteSection(section)}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </section>
        </div>
      </Panel>

      <PrivacySettingsPanel survey={survey} />

      <Panel
        title="Publisering"
        subtitle={
          isPublished
            ? 'Delbar lenke er aktiv'
            : 'Publiser når skjemaet er klart'
        }
      >
        <div className="publish-block">
          <div className="publish-block__intro">
            <p>
              {isPublished
                ? getPublishedIntroText(survey.responseCount)
                : 'Publisering gjør spørreundersøkelsen aktiv, og skjemaet låses automatisk når første svar kommer inn.'}
            </p>
            {publishedAt ? (
              <span>Publisert {formatDateTime(publishedAt)}</span>
            ) : null}
          </div>

          {isPublished ? (
            <div className="share-link-row">
              <input
                aria-label="Delbar respondentlenke"
                readOnly
                value={shareUrl}
              />
              <button
                className="icon-button"
                type="button"
                aria-label="Kopier respondentlenke"
                onClick={handleCopyShareUrl}
              >
                <Copy size={18} aria-hidden="true" />
              </button>
              <a
                className="icon-button"
                href={shareUrl}
                rel="noreferrer"
                target="_blank"
                aria-label="Åpne respondentlenke"
              >
                <ExternalLink size={18} aria-hidden="true" />
              </a>
            </div>
          ) : (
            <div className="form-actions">
              <button
                className="button button--primary"
                type="button"
                disabled={!canPublish || publishSurvey.isPending}
                onClick={handlePublish}
              >
                <Send size={18} aria-hidden="true" />
                {publishSurvey.isPending ? 'Publiserer...' : 'Publiser skjema'}
              </button>
            </div>
          )}
        </div>

        {isDraft && survey.questions.length === 0 ? (
          <div className="form-alert form-alert--error" role="alert">
            Legg til minst ett spørsmål før publisering.
          </div>
        ) : null}
        {isDraft && survey.questions.length > 0 && privacyIssues.length > 0 ? (
          <div className="form-alert form-alert--error" role="alert">
            {privacyIssues[0]}
          </div>
        ) : null}
        {publishValidationError ? (
          <div className="form-alert form-alert--error" role="alert">
            {publishValidationError}
          </div>
        ) : null}
        {publishSurvey.isError ? (
          <div className="form-alert form-alert--error" role="alert">
            {getErrorMessage(publishSurvey.error)}
          </div>
        ) : null}
        {publishMessage ? (
          <div className="form-alert form-alert--success" role="status">
            {publishMessage}
          </div>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={publishDialogOpen}
        title="Publisere skjemaet?"
        description="Respondentlenken blir aktiv med en gang, og skjemaet kan deles med respondenter."
        confirmLabel="Publiser skjema"
        isPending={publishSurvey.isPending}
        onCancel={() => setPublishDialogOpen(false)}
        onConfirm={confirmPublishSurvey}
      />

      <ConfirmDialog
        open={sectionToDelete !== null}
        title="Slette seksjonen?"
        description={`Spørsmål i "${
          sectionToDelete?.title ?? 'Uten tittel'
        }" flyttes til uten seksjon.`}
        confirmLabel="Slett seksjon"
        isPending={deleteSection.isPending}
        variant="danger"
        onCancel={() => setSectionToDelete(null)}
        onConfirm={confirmDeleteSection}
      />

      <ConfirmDialog
        open={questionToDelete !== null}
        title="Slette spørsmålet?"
        description={`"${questionToDelete?.prompt ?? ''}" fjernes fra skjemaet permanent.`}
        confirmLabel="Slett spørsmål"
        isPending={deleteQuestion.isPending}
        variant="danger"
        onCancel={() => setQuestionToDelete(null)}
        onConfirm={confirmDeleteQuestion}
      />
    </>
  );
}

type SurveyVisibilityToggleProps = {
  visibility: SurveyVisibility;
  isPending: boolean;
  onChange: (visibility: SurveyVisibility) => void;
};

function SurveyVisibilityToggle({
  visibility,
  isPending,
  onChange,
}: SurveyVisibilityToggleProps) {
  return (
    <div className="survey-visibility-toggle" aria-label="Synlighet i arbeidsflaten">
      <button
        type="button"
        aria-pressed={visibility === 'private'}
        disabled={isPending}
        title="Personlig: synlig for eier og admin"
        onClick={() => onChange('private')}
      >
        <LockKeyhole size={15} aria-hidden="true" />
        Personlig
      </button>
      <button
        type="button"
        aria-pressed={visibility === 'workspace'}
        disabled={isPending}
        title="Delt: synlig for alle i arbeidsflaten"
        onClick={() => onChange('workspace')}
      >
        <UsersRound size={15} aria-hidden="true" />
        Delt
      </button>
    </div>
  );
}

function EditorAutosaveStatus({
  restoredAt,
  savedAt,
}: {
  restoredAt: number | null;
  savedAt: number;
}) {
  return (
    <div className="form-alert form-alert--info editor-autosave-status" role="status">
      <span>
        {restoredAt
          ? 'Ulagrede endringer ble gjenopprettet fra denne nettleseren.'
          : 'Ulagrede endringer er lagret i denne nettleseren.'}
      </span>
      <strong>{formatAutosaveTime(savedAt)}</strong>
    </div>
  );
}

function PrivacySettingsPanel({ survey }: { survey: SurveyEditor }) {
  const auth = useAuth();
  const updatePrivacySettings = useUpdateSurveyPrivacySettings(survey.id);
  const initialSettings = survey.privacySettings;
  const isIdentified = survey.responseMode === 'identified';
  const previousResponseModeRef = useRef(survey.responseMode);
  const previousControllerNameSuggestionRef = useRef<string | null>(null);
  const myProfile = useMyProfile(auth.account?.id);
  const workspaces = useWorkspaces(auth.account?.id);

  const [surveyKind, setSurveyKind] = useState<PrivacySurveyKind>(
    inferPrivacySurveyKind(survey),
  );
  const [personalDataMode, setPersonalDataMode] = useState<PersonalDataMode>(
    getInitialPersonalDataMode(survey, initialSettings),
  );
  const [controllerName, setControllerName] = useState(
    initialSettings?.controllerName ?? '',
  );
  const [controllerNameEdited, setControllerNameEdited] = useState(
    Boolean(initialSettings?.controllerName),
  );
  const [controllerContact, setControllerContact] = useState(
    initialSettings?.controllerContact ?? '',
  );
  const [controllerContactEdited, setControllerContactEdited] = useState(
    Boolean(initialSettings?.controllerContact),
  );
  const [purpose, setPurpose] = useState(initialSettings?.purpose ?? '');
  const [legalBasis, setLegalBasis] = useState<SurveyLegalBasis | ''>(
    initialSettings?.legalBasis ?? '',
  );
  const [legalBasisNote, setLegalBasisNote] = useState(
    initialSettings?.legalBasisNote ?? '',
  );
  const [consentText, setConsentText] = useState(
    initialSettings?.consentText ?? '',
  );
  const [respondentNotice, setRespondentNotice] = useState(
    initialSettings?.respondentNotice ?? '',
  );
  const [retentionDays, setRetentionDays] = useState(
    String(initialSettings?.retentionDays ?? 90),
  );
  const [retentionChangeReason, setRetentionChangeReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const currentWorkspace = workspaces.data?.find(
    (workspace) => workspace.id === survey.workspaceId,
  );
  const profilePersonalName = getTrimmedSuggestion(myProfile.data?.personalName);
  const profileContactEmail = getTrimmedSuggestion(myProfile.data?.contactEmail);
  const authEmail = getTrimmedSuggestion(auth.user?.email);
  const waitForWorkspaceSuggestion =
    Boolean(survey.workspaceId) && workspaces.isLoading;
  const controllerNameSuggestion = waitForWorkspaceSuggestion
    ? null
    : getTrimmedSuggestion(currentWorkspace?.name) ??
      profilePersonalName ??
      profileContactEmail ??
      authEmail ??
      null;
  const controllerContactSuggestion = profileContactEmail ?? authEmail ?? null;
  const controllerNameHelp = getControllerNameHelp({
    currentWorkspace,
    profilePersonalName,
    usedEmailFallback:
      !currentWorkspace &&
      !profilePersonalName &&
      Boolean(controllerNameSuggestion),
  });
  const controllerContactHelp = profileContactEmail
    ? 'Foreslått fra profilens kontakt-e-post. Kan endres for dette skjemaet.'
    : authEmail
      ? 'Foreslått fra innlogget e-post. Kan endres for dette skjemaet.'
      : 'E-post eller kontaktpunkt for spørsmål om personvern.';

  const effectivePersonalDataMode = isIdentified
    ? 'personal_data'
    : personalDataMode;
  const settingsEnabled =
    isIdentified || effectivePersonalDataMode !== 'none';
  const expectsPersonalData =
    isIdentified || effectivePersonalDataMode !== 'none';
  const isActive = settingsEnabled || expectsPersonalData;
  const parsedRetentionDays = parseRetentionDays(retentionDays);
  const savedRetentionDays = initialSettings?.retentionDays ?? null;
  const isExtendingRetention =
    survey.responseCount > 0 &&
    parsedRetentionDays !== null &&
    savedRetentionDays !== null &&
    parsedRetentionDays > savedRetentionDays;
  const surveyKindOption = getPrivacySurveyKindOption(surveyKind);
  const personalDataModeOption = getPersonalDataModeOption(
    effectivePersonalDataMode,
  );
  const legalBasisDescription = legalBasis
    ? getLegalBasisDescription(legalBasis)
    : null;
  const legalBasisGuidanceLink = legalBasis
    ? legalBasisGuidance[legalBasis]
    : legalBasisGuidanceOverview;
  const currentSettings = buildDraftPrivacySettings(
    survey,
    initialSettings,
    settingsEnabled,
    expectsPersonalData,
    controllerName,
    controllerContact,
    purpose,
    legalBasis || null,
    legalBasisNote,
    consentText,
    respondentNotice,
    parsedRetentionDays,
  );
  const completionIssues = getPrivacyCompletionIssues({
    ...survey,
    privacySettings: currentSettings,
  });

  useEffect(() => {
    const previousResponseMode = previousResponseModeRef.current;
    previousResponseModeRef.current = survey.responseMode;

    if (
      previousResponseMode === 'identified' &&
      survey.responseMode === 'anonymous'
    ) {
      setPersonalDataMode('none');
    }
  }, [survey.responseMode]);

  useEffect(() => {
    const previousSuggestion = previousControllerNameSuggestionRef.current;
    previousControllerNameSuggestionRef.current = controllerNameSuggestion;

    if (
      controllerNameEdited ||
      initialSettings?.controllerName ||
      !controllerNameSuggestion
    ) {
      return;
    }

    if (!controllerName.trim() || controllerName.trim() === previousSuggestion) {
      setControllerName(controllerNameSuggestion);
    }
  }, [
    controllerName,
    controllerNameEdited,
    controllerNameSuggestion,
    initialSettings?.controllerName,
  ]);

  useEffect(() => {
    if (
      controllerContactEdited ||
      initialSettings?.controllerContact ||
      controllerContact.trim() ||
      !controllerContactSuggestion
    ) {
      return;
    }

    setControllerContact(controllerContactSuggestion);
  }, [
    controllerContact,
    controllerContactEdited,
    controllerContactSuggestion,
    initialSettings?.controllerContact,
  ]);

  function handleApplyPrivacySuggestion() {
    const suggestion = buildPrivacySuggestion({
      controllerContact,
      controllerName,
      retentionDays: parseRetentionDays(retentionDays),
      survey,
      surveyKind,
    });

    setPurpose(suggestion.purpose);
    setLegalBasis(suggestion.legalBasis);
    setLegalBasisNote(suggestion.legalBasisNote);
    setConsentText(suggestion.consentText);
    setRespondentNotice(suggestion.respondentNotice);
    setRetentionDays(String(suggestion.retentionDays));

    if (!isIdentified && personalDataMode === 'none') {
      setPersonalDataMode('personal_data');
    }
  }

  async function handleSavePrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setSaveMessage(null);

    if (retentionDays.trim() && parsedRetentionDays === null) {
      setValidationError('Lagringstid må være et helt antall dager.');
      return;
    }

    if (isExtendingRetention && !retentionChangeReason.trim()) {
      setValidationError(
        'Skriv en kort begrunnelse for hvorfor lagringstiden forlenges.',
      );
      return;
    }

    try {
      await updatePrivacySettings.mutateAsync({
        surveyId: survey.id,
        enabled: settingsEnabled,
        personalDataExpected: expectsPersonalData,
        controllerName,
        controllerContact,
        purpose,
        legalBasis: legalBasis || null,
        legalBasisNote,
        consentText,
        retentionDays: parsedRetentionDays,
        retentionAction: 'delete_response',
        respondentNotice,
        retentionChangeReason: isExtendingRetention
          ? retentionChangeReason
          : null,
      });
      setRetentionChangeReason('');
      setSaveMessage('Personverninnstillingene er lagret.');
    } catch {
      return;
    }
  }

  return (
    <div id="privacy" className="scroll-anchor">
      <Panel
        title="Personvern"
        subtitle={
          completionIssues.length === 0
            ? 'Klar for publisering'
            : 'Må fullføres før publisering'
        }
      >
        <form className="form-stack" onSubmit={handleSavePrivacy}>
        <div className="form-alert form-alert--info privacy-alert" role="note">
          Når du lager skjema og sender det ut, er du behandlingsansvarlig for
          formål og lagringstid.
        </div>

        <div className="privacy-assistant">
          <div className="privacy-field-grid">
            <label>
              Hva slags undersøkelse lager du?
              <select
                value={surveyKind}
                disabled={updatePrivacySettings.isPending}
                onChange={(event) =>
                  setSurveyKind(event.target.value as PrivacySurveyKind)
                }
              >
                {privacySurveyKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="field-help">{surveyKindOption.description}</span>
            </label>

            <label>
              Samler du inn personopplysninger?
              <select
                className={isIdentified ? 'select--locked' : undefined}
                value={effectivePersonalDataMode}
                disabled={isIdentified || updatePrivacySettings.isPending}
                onChange={(event) =>
                  setPersonalDataMode(event.target.value as PersonalDataMode)
                }
              >
                {personalDataModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="field-help">
                {isIdentified
                  ? 'Identifiserte skjemaer krever personverninnstillinger.'
                  : personalDataModeOption.description}
              </span>
            </label>
          </div>

          <div className="privacy-assistant__actions">
            <button
              className="button button--secondary"
              type="button"
              disabled={updatePrivacySettings.isPending}
              onClick={handleApplyPrivacySuggestion}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              Bruk forslag
            </button>
          </div>
        </div>

        {isIdentified ? (
          <div className="privacy-note" role="status">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Identifiserte skjemaer samler inn opplysninger som kan
              identifisere respondenten. Derfor må personverninnstillingene
              fylles ut før publisering.
            </p>
          </div>
        ) : null}

        {isActive ? (
          <div className="privacy-details">
            <div className="privacy-field-grid">
              <label>
                Behandlingsansvarlig
                <input
                  type="text"
                  value={controllerName}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="Virksomhet eller prosjekt"
                  onChange={(event) => {
                    setControllerNameEdited(true);
                    setControllerName(event.target.value);
                  }}
                />
                <span className="field-help">{controllerNameHelp}</span>
              </label>
              <label>
                Kontakt
                <input
                  type="text"
                  value={controllerContact}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="personvern@example.no"
                  onChange={(event) => {
                    setControllerContactEdited(true);
                    setControllerContact(event.target.value);
                  }}
                />
                <span className="field-help">{controllerContactHelp}</span>
              </label>
            </div>

            <label>
              Hva skal svarene brukes til?
              <input
                type="text"
                value={purpose}
                disabled={updatePrivacySettings.isPending}
                placeholder="For eksempel evaluere arrangementet"
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>

            <div className="privacy-field-grid">
              <label>
                Hvorfor kan du bruke svarene?
                <select
                  value={legalBasis}
                  disabled={updatePrivacySettings.isPending}
                  onChange={(event) =>
                    setLegalBasis(event.target.value as SurveyLegalBasis | '')
                  }
                >
                  <option value="">Velg grunnlag</option>
                  {Object.entries(legalBasisLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="field-help">
                  {legalBasisDescription}
                  <a
                    className="field-help__link"
                    href={legalBasisGuidanceLink.url}
                    rel="noreferrer"
                    target="_blank"
                    title={legalBasisGuidanceLink.title}
                  >
                    Les mer hos {legalBasisGuidanceLink.label}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </span>
              </label>
              <label>
                Hvor lenge trenger du svarene?
                <select
                  value={retentionDays}
                  disabled={updatePrivacySettings.isPending}
                  onChange={(event) => setRetentionDays(event.target.value)}
                >
                  {retentionPresetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field-help">
                  Endringer oppdaterer også eksisterende svar som ikke allerede
                  er slettet.
                </span>
              </label>
            </div>

            {isExtendingRetention ? (
              <label>
                Begrunnelse for forlengelse
                <textarea
                  rows={2}
                  value={retentionChangeReason}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="Kort vurdering av hvorfor svarene fortsatt er nødvendige for formålet."
                  onChange={(event) =>
                    setRetentionChangeReason(event.target.value)
                  }
                />
                <span className="field-help">
                  Begrunnelsen lagres i personvernloggen for skjemaet og vises
                  ikke til respondenten.
                </span>
              </label>
            ) : null}

            {needsLegalBasisNote(legalBasis) ? (
              <label>
                Kort vurdering
                <input
                  type="text"
                  value={legalBasisNote}
                  disabled={updatePrivacySettings.isPending}
                  placeholder={getLegalBasisNotePlaceholder(legalBasis)}
                  onChange={(event) => setLegalBasisNote(event.target.value)}
                />
              </label>
            ) : null}

            <label>
              Kort tekst til respondenten
              <textarea
                rows={3}
                value={respondentNotice}
                disabled={updatePrivacySettings.isPending}
                placeholder="F.eks. Vi i [virksomhet/prosjekt] bruker svarene til ... Svarene slettes etter ..."
                onChange={(event) => setRespondentNotice(event.target.value)}
              />
            </label>

            {legalBasis === 'consent' ? (
              <label>
                Tekst respondenten godkjenner
                <textarea
                  rows={3}
                  value={consentText}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="Jeg samtykker til at svaret mitt behandles for formålet beskrevet over."
                  onChange={(event) => setConsentText(event.target.value)}
                />
                <span className="field-help">
                  Bruk samtykke bare når deltakelsen er frivillig og samtykket
                  kan trekkes tilbake.
                </span>
              </label>
            ) : null}

            <div className="privacy-summary">
              <ShieldCheck size={18} aria-hidden="true" />
              <p>
                Svar slettes automatisk etter valgt lagringstid.
              </p>
            </div>
          </div>
        ) : (
          <div className="privacy-summary">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Anonyme skjema uten personopplysninger trenger normalt færre
              personvernfelt.
            </p>
          </div>
        )}

        {completionIssues.length > 0 ? (
          <div className="form-alert form-alert--error" role="alert">
            {completionIssues[0]}
          </div>
        ) : null}
        {validationError ? (
          <div className="form-alert form-alert--error" role="alert">
            {validationError}
          </div>
        ) : null}
        {updatePrivacySettings.isError ? (
          <div className="form-alert form-alert--error" role="alert">
            {getErrorMessage(updatePrivacySettings.error)}
          </div>
        ) : null}
        {saveMessage ? (
          <div className="form-alert form-alert--success" role="status">
            {saveMessage}
          </div>
        ) : null}

        <div className="form-actions">
          <button
            className="button button--secondary"
            type="submit"
            disabled={updatePrivacySettings.isPending}
          >
            <Save size={18} aria-hidden="true" />
            {updatePrivacySettings.isPending ? 'Lagrer...' : 'Lagre personvern'}
          </button>
        </div>
        </form>
      </Panel>
    </div>
  );
}

function QuestionCard({
  question,
  disabled,
  canDrag,
  isDragging,
  isDragOver,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  question: SurveyQuestion;
  disabled: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDelete: (question: SurveyQuestion) => void;
  onDragStart: (
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragOver: (
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) => void;
  onDragLeave: (
    question: SurveyQuestion,
    event: DragEvent<HTMLElement>,
  ) => void;
  onDrop: (question: SurveyQuestion, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      className={[
        'question-card',
        canDrag ? 'question-card--draggable' : '',
        isDragging ? 'question-card--dragging' : '',
        isDragOver ? 'question-card--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={canDrag}
      onDragStart={(event) => onDragStart(question, event)}
      onDragOver={(event) => onDragOver(question, event)}
      onDragLeave={(event) => onDragLeave(question, event)}
      onDrop={(event) => onDrop(question, event)}
      onDragEnd={onDragEnd}
    >
      <div
        className="question-card__icon"
        aria-hidden="true"
        title={canDrag ? 'Dra for å endre rekkefølge' : undefined}
      >
        {getQuestionIcon(question)}
      </div>
      <div>
        <div className="question-card__header">
          <div className="question-card__title">
            <h3>{question.prompt}</h3>
            {canDrag ? (
              <span
                className="question-card__drag-hint"
                title="Dra for å endre rekkefølge"
              >
                <GripVertical size={16} aria-hidden="true" />
                <span className="sr-only">Dra for å endre rekkefølge</span>
              </span>
            ) : null}
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={disabled}
            aria-label={`Slett ${question.prompt}`}
            onClick={() => onDelete(question)}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
        {question.description ? <p>{question.description}</p> : null}
        <div className="status-row">
          <span>{getQuestionTypeLabel(question)}</span>
          <span>{question.isRequired ? 'Påkrevd' : 'Valgfri'}</span>
          {question.type === 'likert_scale' ? (
            <span>{formatQuestionScale(question)}</span>
          ) : null}
          {question.allowMultiple ? <span>Flere valg</span> : null}
        </div>
        {question.options.length > 0 ? (
          <div className="option-list">
            {question.options.map((option) => (
              <span key={option.id}>{option.label}</span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function groupQuestionsBySection(
  sections: SurveySection[],
  questions: SurveyQuestion[],
) {
  const unsectionedQuestions = questions.filter(
    (question) => question.sectionId === null,
  );
  const groups = sections.map((section) => ({
    id: section.id,
    title: section.title ?? 'Uten tittel',
    description: section.description,
    questions: questions.filter((question) => question.sectionId === section.id),
  }));

  if (unsectionedQuestions.length > 0 || sections.length === 0) {
    groups.push({
      id: 'unsectioned',
      title: 'Uten seksjon',
      description: null,
      questions: unsectionedQuestions,
    });
  }

  return groups;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function getScalePresetValue(preset: (typeof scalePresets)[number]) {
  return `${preset.min}:${preset.max}:${preset.variant}`;
}

function parseScaleInput(value: string, fallback: number) {
  if (value.trim() === '') {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function getScaleValidationError(scaleMin: number, scaleMax: number) {
  if (!Number.isInteger(scaleMin) || !Number.isInteger(scaleMax)) {
    return 'Skalaen må bruke hele tall.';
  }

  if (scaleMin < questionScaleLimits.min || scaleMax > questionScaleLimits.max) {
    return `Skalaen må være mellom ${questionScaleLimits.min} og ${questionScaleLimits.max}.`;
  }

  if (scaleMin >= scaleMax) {
    return 'Skalaen må ha lavere minimumsverdi enn maksimumsverdi.';
  }

  return null;
}

function formatQuestionScale(question: SurveyQuestion) {
  const scaleMin = question.scaleMin ?? questionScaleDefaults.min;
  const scaleMax = question.scaleMax ?? questionScaleDefaults.max;

  if (question.scaleVariant === 'stars') {
    return '1-5 stjerner';
  }

  if (question.scaleVariant === 'nps') {
    return 'NPS 0-10';
  }

  return `Skala ${scaleMin}-${scaleMax}`;
}

function getQuestionTypeLabel(question: SurveyQuestion) {
  if (question.type !== 'likert_scale') {
    return questionTypeLabels[question.type];
  }

  if (question.scaleVariant === 'stars') {
    return 'Stjerner';
  }

  if (question.scaleVariant === 'nps') {
    return 'NPS';
  }

  return questionTypeLabels.likert_scale;
}

function getQuestionIcon(question: SurveyQuestion) {
  if (question.type === 'free_text') {
    return <Type size={20} />;
  }

  if (question.type === 'likert_scale') {
    if (question.scaleVariant === 'stars') {
      return <Star size={20} />;
    }

    if (question.scaleVariant === 'nps') {
      return <Gauge size={20} />;
    }

    return <SlidersHorizontal size={20} />;
  }

  return <ListChecks size={20} />;
}

function getStructureLockMessage(
  status: SurveySummary['status'],
  responseCount: number,
) {
  if (responseCount > 0) {
    return `Skjemastrukturen er låst fordi ${responseCount} svar er sendt inn. Opprett et nytt skjema eller en ny versjon hvis spørsmål, seksjoner eller alternativer skal endres.`;
  }

  if (status === 'closed') {
    return 'Lukkede skjemaer kan ikke endres her.';
  }

  return null;
}

type PrivacySuggestion = {
  purpose: string;
  legalBasis: SurveyLegalBasis | '';
  legalBasisNote: string;
  consentText: string;
  respondentNotice: string;
  retentionDays: number;
};

function inferPrivacySurveyKind(survey: Pick<SurveyEditor, 'title'>) {
  const title = survey.title.toLowerCase();

  if (
    includesAny(title, [
      'master',
      'bachelor',
      'oppgave',
      'student',
      'forsk',
      'studie',
    ])
  ) {
    return 'student_project';
  }

  if (
    includesAny(title, [
      'medarbeider',
      'ansatt',
      'trivsel',
      'puls',
      'arbeidsmiljø',
      'arbeidsmiljo',
    ])
  ) {
    return 'employee_survey';
  }

  if (
    includesAny(title, ['arrangement', 'påmelding', 'pamelding', 'kurs', 'event'])
  ) {
    return 'event_registration';
  }

  if (
    includesAny(title, ['kunde', 'nps', 'tilfreds', 'service', 'produkt'])
  ) {
    return 'customer_feedback';
  }

  return 'customer_feedback';
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function getTrimmedSuggestion(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function getControllerNameHelp({
  currentWorkspace,
  profilePersonalName,
  usedEmailFallback,
}: {
  currentWorkspace: WorkspaceWithMembership | undefined;
  profilePersonalName: string | null;
  usedEmailFallback: boolean;
}) {
  if (currentWorkspace?.type === 'business') {
    return 'Foreslått fra bedriften/arbeidsflaten. Kan endres for dette skjemaet.';
  }

  if (currentWorkspace?.type === 'team') {
    return 'Foreslått fra teamet/arbeidsflaten. Kan endres for dette skjemaet.';
  }

  if (profilePersonalName) {
    return 'Foreslått fra profilen. Kan endres for dette skjemaet.';
  }

  if (usedEmailFallback) {
    return 'Foreslått fra registrert e-post for personlig konto. Kan endres for dette skjemaet.';
  }

  return 'Hvem bestemmer hvorfor svarene samles inn og hvor lenge de lagres?';
}

function getInitialPersonalDataMode(
  survey: Pick<SurveyEditor, 'responseMode'>,
  settings: SurveyPrivacySettings | null,
): PersonalDataMode {
  if (survey.responseMode === 'identified') {
    return 'personal_data';
  }

  if (settings?.enabled && settings.personalDataExpected) {
    return 'personal_data';
  }

  return 'none';
}

function getPrivacySurveyKindOption(kind: PrivacySurveyKind) {
  return (
    privacySurveyKindOptions.find((option) => option.value === kind) ??
    privacySurveyKindOptions[0]
  );
}

function getPersonalDataModeOption(mode: PersonalDataMode) {
  return (
    personalDataModeOptions.find((option) => option.value === mode) ??
    personalDataModeOptions[0]
  );
}

function buildPrivacySuggestion({
  controllerContact,
  controllerName,
  retentionDays,
  survey,
  surveyKind,
}: {
  controllerContact: string;
  controllerName: string;
  retentionDays: number | null;
  survey: SurveyEditor;
  surveyKind: PrivacySurveyKind;
}): PrivacySuggestion {
  const controller = controllerName.trim() || '[behandlingsansvarlig]';
  const contact = controllerContact.trim() || '[kontaktperson/e-post]';
  const title = survey.title.trim() || 'undersøkelsen';
  const fallbackDays = getSuggestedRetentionDays(surveyKind);
  const days = retentionDays ?? fallbackDays;
  const retentionLabel = formatPrivacyRetentionDays(days);
  const base = getPrivacySuggestionBase(surveyKind, title);
  const purposeSentence = toSentenceContinuation(base.purpose);

  if (base.legalBasis === 'consent') {
    return {
      ...base,
      consentText: `Jeg samtykker til at ${controller} behandler svarene mine for å ${purposeSentence}. Jeg kan trekke samtykket tilbake ved å kontakte ${contact}.`,
      respondentNotice: `Deltakelse er frivillig. ${controller} bruker svarene for å ${purposeSentence}. Du kan trekke samtykket tilbake ved å kontakte ${contact}. Svarene slettes automatisk etter ${retentionLabel}.`,
      retentionDays: days,
    };
  }

  const basisLabel = base.legalBasis
    ? legalBasisLabel[base.legalBasis].toLowerCase()
    : 'grunnlaget dere velger';

  return {
    ...base,
    consentText: '',
    respondentNotice: `${controller} bruker svarene for å ${purposeSentence}. Behandlingen bygger på ${basisLabel}. Svarene slettes automatisk etter ${retentionLabel}. Kontakt ${contact} ved spørsmål om personvern.`,
    retentionDays: days,
  };
}

function toSentenceContinuation(value: string) {
  return value.charAt(0).toLocaleLowerCase('nb-NO') + value.slice(1);
}

function getPrivacySuggestionBase(
  surveyKind: PrivacySurveyKind,
  title: string,
): Omit<PrivacySuggestion, 'consentText' | 'respondentNotice' | 'retentionDays'> {
  if (surveyKind === 'student_project') {
    return {
      purpose: `Samle inn data til student-/forskningsprosjektet «${title}»`,
      legalBasis: 'consent',
      legalBasisNote:
        'Deltakelse er frivillig, og respondenten kan trekke samtykket tilbake.',
    };
  }

  if (surveyKind === 'employee_survey') {
    return {
      purpose: 'Forstå og forbedre arbeidsmiljø, trivsel og interne prosesser',
      legalBasis: 'legitimate_interests',
      legalBasisNote:
        'Samtykke er ofte lite egnet i arbeidsforhold. Vurder interesseavveiing eller annen intern hjemmel.',
    };
  }

  if (surveyKind === 'event_registration') {
    return {
      purpose: `Administrere deltakelse og følge opp arrangementet «${title}»`,
      legalBasis: 'contract',
      legalBasisNote: '',
    };
  }

  if (surveyKind === 'other') {
    return {
      purpose: `Behandle svarene i «${title}» til formålet du beskriver`,
      legalBasis: '',
      legalBasisNote: '',
    };
  }

  return {
    purpose: 'Forstå og forbedre kundeopplevelsen og tjenestene våre',
    legalBasis: 'legitimate_interests',
    legalBasisNote:
      'Vi har vurdert at formålet er saklig, at opplysningene er nødvendige, og at hensynet til respondentenes rettigheter ikke veier tyngre.',
  };
}

function getSuggestedRetentionDays(surveyKind: PrivacySurveyKind) {
  if (surveyKind === 'student_project') {
    return 365;
  }

  if (surveyKind === 'employee_survey') {
    return 180;
  }

  return 90;
}

function formatPrivacyRetentionDays(days: number) {
  if (days === 180) {
    return '6 måneder';
  }

  if (days === 365) {
    return '12 måneder';
  }

  if (days === 730) {
    return '24 måneder';
  }

  return `${days} dager`;
}

function getLegalBasisDescription(legalBasis: SurveyLegalBasis) {
  if (legalBasis === 'consent') {
    return 'Respondenten sier aktivt ja før svaring.';
  }

  if (legalBasis === 'legitimate_interests') {
    return 'Bruk når dere har en berettiget interesse, behandlingen er nødvendig, og respondentens rettigheter ikke veier tyngre.';
  }

  if (legalBasis === 'contract') {
    return 'Bruk når opplysningene trengs for å levere eller administrere noe respondenten har avtale om.';
  }

  if (legalBasis === 'legal_obligation') {
    return 'Bruk når en lov eller forskrift pålegger dere å behandle opplysningene.';
  }

  if (legalBasis === 'public_task') {
    return 'Bruk for offentlige oppgaver eller oppgaver i allmennhetens interesse.';
  }

  return 'Bruk bare hvis dere har vurdert et annet gyldig grunnlag.';
}

function buildDraftPrivacySettings(
  survey: SurveyEditor,
  currentSettings: SurveyPrivacySettings | null,
  enabled: boolean,
  personalDataExpected: boolean,
  controllerName: string,
  controllerContact: string,
  purpose: string,
  legalBasis: SurveyLegalBasis | null,
  legalBasisNote: string,
  consentText: string,
  respondentNotice: string,
  retentionDays: number | null,
): SurveyPrivacySettings {
  const now = new Date().toISOString();

  return {
    surveyId: survey.id,
    enabled,
    personalDataExpected,
    controllerName: controllerName.trim() || null,
    controllerContact: controllerContact.trim() || null,
    purpose: purpose.trim() || null,
    legalBasis,
    legalBasisNote: legalBasisNote.trim() || null,
    consentText: legalBasis === 'consent' ? consentText.trim() || null : null,
    retentionDays,
    retentionAction: currentSettings?.retentionAction ?? 'delete_response',
    respondentNotice: respondentNotice.trim() || null,
    createdAt: currentSettings?.createdAt ?? now,
    updatedAt: currentSettings?.updatedAt ?? now,
  };
}

function getPrivacyCompletionIssues(
  survey: Pick<SurveyEditor, 'privacySettings' | 'responseMode'>,
) {
  const settings = survey.privacySettings;
  const privacyRequired =
    survey.responseMode === 'identified' ||
    Boolean(settings?.enabled) ||
    Boolean(settings?.personalDataExpected);

  if (!privacyRequired) {
    return [];
  }

  if (!settings) {
    return ['Fyll ut personverninnstillingene før publisering.'];
  }

  if (!settings.controllerName?.trim()) {
    return ['Fyll ut behandlingsansvarlig før publisering.'];
  }

  if (!settings.controllerContact?.trim()) {
    return ['Fyll ut kontakt for personvern før publisering.'];
  }

  if (!settings.purpose?.trim()) {
    return ['Fyll ut formålet med innsamlingen før publisering.'];
  }

  if (!settings.legalBasis) {
    return ['Velg rettslig grunnlag før publisering.'];
  }

  if (!settings.retentionDays) {
    return ['Velg lagringstid før publisering.'];
  }

  if (settings.legalBasis === 'consent' && !settings.consentText?.trim()) {
    return ['Fyll ut samtykketekst før publisering.'];
  }

  return [];
}

function parseRetentionDays(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function needsLegalBasisNote(legalBasis: SurveyLegalBasis | '') {
  return (
    legalBasis === 'legal_obligation' ||
    legalBasis === 'legitimate_interests' ||
    legalBasis === 'other'
  );
}

function getLegalBasisNotePlaceholder(legalBasis: SurveyLegalBasis | '') {
  if (legalBasis === 'legal_obligation') {
    return 'Hvilken lov eller forskrift?';
  }

  if (legalBasis === 'legitimate_interests') {
    return 'Kort om interesseavveiingen';
  }

  return 'Kort forklaring';
}

function getPublishedIntroText(responseCount: number) {
  if (responseCount === 0) {
    return 'Skjemaet kan nå åpnes av respondenter med lenken. Du kan fortsatt justere struktur frem til første svar kommer inn.';
  }

  return 'Skjemaet kan åpnes av respondenter med lenken. Strukturen er låst for å bevare historiske svar.';
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toDateTimeInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
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

function getSurveyEditorLocalDraftStorageKey(surveyId: string) {
  return `svario:survey-editor:${surveyId}:draft`;
}

function readSurveyEditorLocalDraft(key: string, surveyId: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);

    if (!value) {
      return null;
    }

    const parsedValue = JSON.parse(value) as unknown;

    if (!isSurveyEditorLocalDraft(parsedValue, surveyId)) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsedValue;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      return null;
    }
    return null;
  }
}

function writeSurveyEditorLocalDraft(
  key: string,
  draft: SurveyEditorLocalDraft,
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    return;
  }
}

function removeSurveyEditorLocalDraft(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function getSurveyEditorLocalDraftFingerprint(draft: SurveyEditorLocalDraft) {
  return JSON.stringify({
    ...draft,
    savedAt: 0,
  });
}

function isSurveyEditorLocalDraftMeaningful(
  draft: SurveyEditorLocalDraft,
  survey: SurveyEditor,
) {
  const basicChanged =
    draft.basic.title !== survey.title ||
    draft.basic.description !== (survey.description ?? '') ||
    draft.basic.responseMode !== survey.responseMode ||
    draft.basic.startsAt !== toDateTimeInputValue(survey.startsAt) ||
    draft.basic.endsAt !== toDateTimeInputValue(survey.endsAt) ||
    draft.basic.visibility !== survey.visibility;

  const sectionHasContent =
    draft.section.title.trim().length > 0 ||
    draft.section.description.trim().length > 0;

  const questionHasContent =
    draft.question.prompt.trim().length > 0 ||
    draft.question.description.trim().length > 0 ||
    draft.question.isRequired !== true ||
    draft.question.allowMultiple !== false ||
    draft.question.optionText !== defaultOptionText ||
    draft.question.scaleMin !== questionScaleDefaults.min ||
    draft.question.scaleMax !== questionScaleDefaults.max ||
    draft.question.scaleVariant !== 'buttons' ||
    draft.question.sectionId !== null ||
    draft.question.type !== 'multiple_choice';

  return basicChanged || sectionHasContent || questionHasContent;
}

function isSurveyEditorLocalDraft(
  value: unknown,
  surveyId: string,
): value is SurveyEditorLocalDraft {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.version !== editorDraftVersion ||
    value.surveyId !== surveyId ||
    typeof value.savedAt !== 'number'
  ) {
    return false;
  }

  return (
    isSurveyEditorLocalDraftBasic(value.basic) &&
    isSurveyEditorLocalDraftSection(value.section) &&
    isSurveyEditorLocalDraftQuestion(value.question)
  );
}

function isSurveyEditorLocalDraftBasic(
  value: unknown,
): value is SurveyEditorLocalDraft['basic'] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isSurveyResponseMode(value.responseMode) &&
    typeof value.startsAt === 'string' &&
    typeof value.endsAt === 'string' &&
    isSurveyVisibility(value.visibility)
  );
}

function isSurveyEditorLocalDraftSection(
  value: unknown,
): value is SurveyEditorLocalDraft['section'] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.description === 'string'
  );
}

function isSurveyEditorLocalDraftQuestion(
  value: unknown,
): value is SurveyEditorLocalDraft['question'] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isQuestionType(value.type) &&
    (typeof value.sectionId === 'string' || value.sectionId === null) &&
    typeof value.prompt === 'string' &&
    typeof value.description === 'string' &&
    typeof value.isRequired === 'boolean' &&
    typeof value.allowMultiple === 'boolean' &&
    typeof value.optionText === 'string' &&
    typeof value.scaleMin === 'number' &&
    typeof value.scaleMax === 'number' &&
    isQuestionScaleVariant(value.scaleVariant)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSurveyResponseMode(
  value: unknown,
): value is SurveySummary['responseMode'] {
  return value === 'anonymous' || value === 'identified';
}

function isSurveyVisibility(value: unknown): value is SurveyVisibility {
  return value === 'private' || value === 'workspace';
}

function isQuestionType(value: unknown): value is QuestionType {
  return (
    value === 'multiple_choice' ||
    value === 'free_text' ||
    value === 'likert_scale'
  );
}

function isQuestionScaleVariant(
  value: unknown,
): value is QuestionScaleVariant {
  return value === 'buttons' || value === 'stars' || value === 'nps';
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

function formatSurveyWindow(survey: SurveySummary) {
  if (survey.startsAt && survey.endsAt) {
    return `${formatDate(survey.startsAt)}-${formatDate(survey.endsAt)}`;
  }

  if (survey.endsAt) {
    return `Varer til ${formatDate(survey.endsAt)}`;
  }

  if (survey.startsAt) {
    return `Starter ${formatDate(survey.startsAt)}`;
  }

  return 'Uten tidsavgrensning';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatAutosaveTime(value: number) {
  return new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function createShareUrl(slug: string) {
  const respondentPath = routes.respondent(slug);

  if (typeof window === 'undefined') {
    return `#${respondentPath}`;
  }

  return `${window.location.origin}${window.location.pathname}#${respondentPath}`;
}
