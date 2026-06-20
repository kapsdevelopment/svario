import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Gauge,
  Layers2,
  ListChecks,
  Plus,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Type,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAddSurveyQuestion } from '../../../application/surveys/useAddSurveyQuestion';
import { useAddSurveySection } from '../../../application/surveys/useAddSurveySection';
import { useDeleteSurveyQuestion } from '../../../application/surveys/useDeleteSurveyQuestion';
import { useDeleteSurveySection } from '../../../application/surveys/useDeleteSurveySection';
import { usePublishSurvey } from '../../../application/surveys/usePublishSurvey';
import { useSurveyEditor } from '../../../application/surveys/useSurveyEditor';
import { useUpdateSurveyBasicInfo } from '../../../application/surveys/useUpdateSurveyBasicInfo';
import { useUpdateSurveyPrivacySettings } from '../../../application/surveys/useUpdateSurveyPrivacySettings';
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
} from '../../../domain/surveys/survey';
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

type PrivacySurveyKind =
  | 'customer_feedback'
  | 'employee_survey'
  | 'student_project'
  | 'event_registration'
  | 'other';

type PersonalDataMode = 'none' | 'direct' | 'possible';

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
    value: 'direct',
    label: 'Ja, navn/e-post eller lignende',
    description:
      'Bruk når svarene kobles til opplysninger som kan identifisere respondenten.',
  },
  {
    value: 'possible',
    label: 'Kanskje, fritekst kan inneholde det',
    description:
      'Bruk når svarene er anonyme, men respondentene kan skrive personopplysninger selv.',
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

export function SurveyEditorPage() {
  const { surveyId } = useParams();
  const { data: survey, error, isError, isLoading } = useSurveyEditor(surveyId);

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
  const publishSurvey = usePublishSurvey(survey.id);
  const updateBasicInfo = useUpdateSurveyBasicInfo(survey.id);

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
  const [basicValidationError, setBasicValidationError] = useState<
    string | null
  >(null);
  const [basicMessage, setBasicMessage] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [optionText, setOptionText] = useState('Ja\nNei');
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

  const currentStatus = publishSurvey.data?.status ?? survey.status;
  const publishedAt = publishSurvey.data?.publishedAt ?? survey.publishedAt;
  const isDraft = currentStatus === 'draft';
  const isPublished = currentStatus === 'published';
  const structureLockMessage = getStructureLockMessage(
    currentStatus,
    survey.responseCount,
  );
  const canEditStructure = structureLockMessage === null;
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
  }, [
    survey.description,
    survey.endsAt,
    survey.responseMode,
    survey.startsAt,
    survey.title,
  ]);

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
      setBasicMessage('Grunninfo er oppdatert.');
    } catch {
      return;
    }
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
    setOptionText('Ja\nNei');
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

    const shouldPublish = window.confirm(
      'Publisere skjemaet nå? Respondentlenken blir aktiv med en gang.',
    );

    if (!shouldPublish) {
      return;
    }

    try {
      await publishSurvey.mutateAsync();
      setPublishMessage('Skjemaet er publisert. Lenken er aktiv.');
    } catch {
      return;
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

  async function handleDelete(question: SurveyQuestion) {
    const shouldDelete = window.confirm(`Slette spørsmålet "${question.prompt}"?`);

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteQuestion.mutateAsync(question.id);
    } catch {
      return;
    }
  }

  async function handleDeleteSection(section: SurveySection) {
    const shouldDelete = window.confirm(
      `Slette seksjonen "${section.title ?? 'Uten tittel'}"? Spørsmål flyttes til uten seksjon.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteSection.mutateAsync(section.id);
    } catch {
      return;
    }
  }

  return (
    <>
      <div className="metric-grid">
        <Panel title="Status" subtitle={statusLabel[currentStatus]} />
        <Panel
          title="Besvarelser"
          subtitle={`${survey.responseCount} innsendt · ${
            responseModeLabel[survey.responseMode]
          }`}
        />
        <Panel title="Spørsmål" subtitle={`${survey.questions.length} totalt`} />
      </div>

      <Panel title="Grunninfo" subtitle={formatSurveyWindow(survey)}>
        <form className="form-stack" onSubmit={handleSaveBasicInfo}>
          <div className="form-grid form-grid--two">
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
                rows={3}
                value={basicDescription}
                disabled={updateBasicInfo.isPending}
                onChange={(event) => setBasicDescription(event.target.value)}
              />
            </label>
          </div>

          <div className="form-grid">
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

          {survey.responseCount > 0 ? (
            <div className="form-alert form-alert--info" role="status">
              Svarmodus er låst fordi skjemaet har innsendte svar.
            </div>
          ) : null}

          <div className="status-row">
            <span className={`status-pill status-pill--${currentStatus}`}>
              {statusLabel[currentStatus]}
            </span>
            <span>{survey.slug}</span>
          </div>

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
          {basicMessage ? (
            <div className="form-alert form-alert--success" role="status">
              {basicMessage}
            </div>
          ) : null}

          <div className="form-actions">
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
                : 'Utkast er kun synlig i admin. Publisering gjør respondentlenken aktiv, og strukturen låses automatisk når første svar kommer inn.'}
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

      <Panel
        title="Seksjoner"
        subtitle={
          survey.sections.length === 0
            ? 'Valgfritt, men nyttig for lengre skjemaer'
            : `${survey.sections.length} seksjoner`
        }
      >
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
                onChange={(event) => setSectionDescription(event.target.value)}
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
                  {section.description ? <p>{section.description}</p> : null}
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
      </Panel>

      <Panel title="Legg til spørsmål">
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
                onChange={(event) => setType(event.target.value as QuestionType)}
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
                      event.target.value === 'none' ? null : event.target.value,
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
                  onChange={(event) => handleScalePresetChange(event.target.value)}
                >
                  {scalePresets.map((preset) => (
                    <option key={getScalePresetValue(preset)} value={getScalePresetValue(preset)}>
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
                    setScaleMin(parseScaleInput(event.target.value, scaleMin));
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
                    setScaleMax(parseScaleInput(event.target.value, scaleMax));
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
      </Panel>

      <Panel
        title="Spørsmål"
        subtitle={
          survey.questions.length === 0
            ? 'Ingen spørsmål er lagt til ennå'
            : `${survey.questions.length} i rekkefølge`
        }
      >
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
                  disabled={!canEditStructure || deleteQuestion.isPending}
                  onDelete={handleDelete}
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
        </div>
      </Panel>
    </>
  );
}

function PrivacySettingsPanel({ survey }: { survey: SurveyEditor }) {
  const updatePrivacySettings = useUpdateSurveyPrivacySettings(survey.id);
  const initialSettings = survey.privacySettings;
  const isIdentified = survey.responseMode === 'identified';

  const [surveyKind, setSurveyKind] = useState<PrivacySurveyKind>(
    inferPrivacySurveyKind(survey),
  );
  const [personalDataMode, setPersonalDataMode] = useState<PersonalDataMode>(
    getInitialPersonalDataMode(survey, initialSettings),
  );
  const [controllerName, setControllerName] = useState(
    initialSettings?.controllerName ?? '',
  );
  const [controllerContact, setControllerContact] = useState(
    initialSettings?.controllerContact ?? '',
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const effectivePersonalDataMode = isIdentified ? 'direct' : personalDataMode;
  const settingsEnabled =
    isIdentified || effectivePersonalDataMode !== 'none';
  const expectsPersonalData =
    isIdentified || effectivePersonalDataMode !== 'none';
  const isActive = settingsEnabled || expectsPersonalData;
  const surveyKindOption = getPrivacySurveyKindOption(surveyKind);
  const personalDataModeOption = getPersonalDataModeOption(
    effectivePersonalDataMode,
  );
  const legalBasisDescription = legalBasis
    ? getLegalBasisDescription(legalBasis)
    : null;
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
    parseRetentionDays(retentionDays),
  );
  const completionIssues = getPrivacyCompletionIssues({
    ...survey,
    privacySettings: currentSettings,
  });

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
      setPersonalDataMode('possible');
    }
  }

  async function handleSavePrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setSaveMessage(null);

    const parsedRetentionDays = parseRetentionDays(retentionDays);

    if (retentionDays.trim() && parsedRetentionDays === null) {
      setValidationError('Lagringstid må være et helt antall dager.');
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
      });
      setSaveMessage('Personverninnstillingene er lagret.');
    } catch {
      return;
    }
  }

  return (
    <Panel
      title="Personvern"
      subtitle={
        completionIssues.length === 0
          ? 'Klar for publisering'
          : 'Mangler før publisering'
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
                  onChange={(event) => setControllerName(event.target.value)}
                />
                <span className="field-help">
                  Hvem bestemmer hvorfor svarene samles inn og hvor lenge de
                  lagres?
                </span>
              </label>
              <label>
                Kontakt
                <input
                  type="text"
                  value={controllerContact}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="personvern@example.no"
                  onChange={(event) => setControllerContact(event.target.value)}
                />
                <span className="field-help">
                  E-post eller kontaktpunkt for spørsmål om personvern.
                </span>
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
                  Dette kalles rettslig grunnlag.
                  {legalBasisDescription ? ` ${legalBasisDescription}` : ''}
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
              </label>
            </div>

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
                placeholder="Kort forklaring av hva svarene brukes til, hvem som er ansvarlig og hvor lenge de lagres."
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
                Svario lagrer ikke IP-adresse på besvarelser. Svar slettes
                automatisk etter valgt lagringstid når den daglige
                retention-jobben kjører.
              </p>
            </div>
          </div>
        ) : (
          <div className="privacy-summary">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Anonyme skjema uten personopplysninger trenger normalt færre
              personvernfelt. Svario lagrer fortsatt ikke IP-adresse på
              besvarelser.
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
  );
}

function QuestionCard({
  question,
  disabled,
  onDelete,
}: {
  question: SurveyQuestion;
  disabled: boolean;
  onDelete: (question: SurveyQuestion) => void;
}) {
  return (
    <article className="question-card">
      <div className="question-card__icon" aria-hidden="true">
        {getQuestionIcon(question)}
      </div>
      <div>
        <div className="question-card__header">
          <h3>{question.prompt}</h3>
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

function getInitialPersonalDataMode(
  survey: Pick<SurveyEditor, 'responseMode'>,
  settings: SurveyPrivacySettings | null,
): PersonalDataMode {
  if (survey.responseMode === 'identified') {
    return 'direct';
  }

  if (settings?.enabled && settings.personalDataExpected) {
    return 'possible';
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

  if (base.legalBasis === 'consent') {
    return {
      ...base,
      consentText: `Jeg samtykker til at ${controller} behandler svarene mine for å ${base.purpose}. Jeg kan trekke samtykket tilbake ved å kontakte ${contact}.`,
      respondentNotice: `Deltakelse er frivillig. ${controller} bruker svarene for å ${base.purpose}. Du kan trekke samtykket tilbake ved å kontakte ${contact}. Svarene slettes automatisk etter ${retentionLabel}.`,
      retentionDays: days,
    };
  }

  const basisLabel = base.legalBasis
    ? legalBasisLabel[base.legalBasis].toLowerCase()
    : 'grunnlaget dere velger';

  return {
    ...base,
    consentText: '',
    respondentNotice: `${controller} bruker svarene for å ${base.purpose}. Behandlingen bygger på ${basisLabel}. Svarene slettes automatisk etter ${retentionLabel}. Kontakt ${contact} ved spørsmål om personvern.`,
    retentionDays: days,
  };
}

function getPrivacySuggestionBase(
  surveyKind: PrivacySurveyKind,
  title: string,
): Omit<PrivacySuggestion, 'consentText' | 'respondentNotice' | 'retentionDays'> {
  if (surveyKind === 'student_project') {
    return {
      purpose: `samle inn data til student-/forskningsprosjektet «${title}»`,
      legalBasis: 'consent',
      legalBasisNote:
        'Deltakelse er frivillig, og respondenten kan trekke samtykket tilbake.',
    };
  }

  if (surveyKind === 'employee_survey') {
    return {
      purpose: 'forstå og forbedre arbeidsmiljø, trivsel og interne prosesser',
      legalBasis: 'legitimate_interests',
      legalBasisNote:
        'Samtykke er ofte lite egnet i arbeidsforhold. Vurder interesseavveiing eller annen intern hjemmel.',
    };
  }

  if (surveyKind === 'event_registration') {
    return {
      purpose: `administrere deltakelse og følge opp arrangementet «${title}»`,
      legalBasis: 'contract',
      legalBasisNote: '',
    };
  }

  if (surveyKind === 'other') {
    return {
      purpose: `behandle svarene i «${title}» til formålet du beskriver`,
      legalBasis: '',
      legalBasisNote: '',
    };
  }

  return {
    purpose: 'forstå og forbedre kundeopplevelsen og tjenestene våre',
    legalBasis: 'legitimate_interests',
    legalBasisNote:
      'Vi bruker svarene til forbedring og begrenser opplysningene til det som er nødvendig.',
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
    return 'Bruk når dere har et saklig behov og har vurdert respondentens interesser.';
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

function createShareUrl(slug: string) {
  const respondentPath = routes.respondent(slug);

  if (typeof window === 'undefined') {
    return `#${respondentPath}`;
  }

  return `${window.location.origin}${window.location.pathname}#${respondentPath}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Noe gikk galt i skjemabyggeren.';
}
