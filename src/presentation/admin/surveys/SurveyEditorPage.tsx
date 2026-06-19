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
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAddSurveyQuestion } from '../../../application/surveys/useAddSurveyQuestion';
import { useAddSurveySection } from '../../../application/surveys/useAddSurveySection';
import { useDeleteSurveyQuestion } from '../../../application/surveys/useDeleteSurveyQuestion';
import { useDeleteSurveySection } from '../../../application/surveys/useDeleteSurveySection';
import { usePublishSurvey } from '../../../application/surveys/usePublishSurvey';
import { useSurveyEditor } from '../../../application/surveys/useSurveyEditor';
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
        {survey.description ? <p>{survey.description}</p> : null}
        <div className="status-row">
          <span className={`status-pill status-pill--${currentStatus}`}>
            {statusLabel[currentStatus]}
          </span>
          <span>{survey.slug}</span>
        </div>
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

  const [enabled, setEnabled] = useState(
    initialSettings?.enabled ?? isIdentified,
  );
  const [personalDataExpected, setPersonalDataExpected] = useState(
    initialSettings?.personalDataExpected ?? isIdentified,
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
  const [retentionDays, setRetentionDays] = useState(
    String(initialSettings?.retentionDays ?? 90),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const settingsEnabled = isIdentified || enabled;
  const expectsPersonalData = isIdentified || personalDataExpected;
  const isActive = settingsEnabled || expectsPersonalData;
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
    parseRetentionDays(retentionDays),
  );
  const completionIssues = getPrivacyCompletionIssues({
    ...survey,
    privacySettings: currentSettings,
  });

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
        respondentNotice: null,
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
        <div className="form-alert form-alert--info" role="note">
          Når du lager skjema og sender det ut, er du behandlingsansvarlig for
          formål og lagringstid.
        </div>

        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settingsEnabled}
              disabled={isIdentified || updatePrivacySettings.isPending}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Personverninnstillinger
          </label>
          <label>
            <input
              type="checkbox"
              checked={expectsPersonalData}
              disabled={isIdentified || updatePrivacySettings.isPending}
              onChange={(event) =>
                setPersonalDataExpected(event.target.checked)
              }
            />
            Kan inneholde personopplysninger
          </label>
        </div>

        {isIdentified ? (
          <div className="form-alert form-alert--info" role="status">
            Identifiserte skjemaer samler inn opplysninger som kan identifisere
            respondenten. Derfor må personverninnstillingene fylles ut før
            publisering.
          </div>
        ) : null}

        {isActive ? (
          <>
            <div className="form-grid form-grid--two">
              <label>
                Behandlingsansvarlig
                <input
                  type="text"
                  value={controllerName}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="Virksomhet eller prosjekt"
                  onChange={(event) => setControllerName(event.target.value)}
                />
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
              </label>
            </div>

            <label>
              Formål
              <input
                type="text"
                value={purpose}
                disabled={updatePrivacySettings.isPending}
                placeholder="For eksempel evaluere arrangementet"
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>

            <div className="form-grid form-grid--two">
              <label>
                Rettslig grunnlag
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
              </label>
              <label>
                Lagringstid
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
                Notat om grunnlag
                <input
                  type="text"
                  value={legalBasisNote}
                  disabled={updatePrivacySettings.isPending}
                  placeholder={getLegalBasisNotePlaceholder(legalBasis)}
                  onChange={(event) => setLegalBasisNote(event.target.value)}
                />
              </label>
            ) : null}

            {legalBasis === 'consent' ? (
              <label>
                Samtykketekst
                <textarea
                  rows={3}
                  value={consentText}
                  disabled={updatePrivacySettings.isPending}
                  placeholder="Jeg samtykker til at svaret mitt behandles for formålet beskrevet over."
                  onChange={(event) => setConsentText(event.target.value)}
                />
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
          </>
        ) : null}

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
    respondentNotice: currentSettings?.respondentNotice ?? null,
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
