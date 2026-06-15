import {
  ArrowLeft,
  CheckCircle2,
  Layers2,
  ListChecks,
  Plus,
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
import { useSurveyEditor } from '../../../application/surveys/useSurveyEditor';
import type {
  QuestionType,
  SurveyEditor,
  SurveyQuestion,
  SurveySection,
  SurveySummary,
} from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

const questionTypeLabels = {
  multiple_choice: 'Flervalg',
  free_text: 'Fritekst',
  likert_1_5: 'Likert 1-5',
} satisfies Record<QuestionType, string>;

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

  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [optionText, setOptionText] = useState('Ja\nNei');
  const [sectionValidationError, setSectionValidationError] = useState<
    string | null
  >(null);
  const [questionValidationError, setQuestionValidationError] = useState<
    string | null
  >(null);

  const isDraft = survey.status === 'draft';
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

  async function handleAddSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSectionValidationError(null);

    if (!isDraft) {
      setSectionValidationError(
        'Publiserte og lukkede skjemaer kan ikke endres her.',
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuestionValidationError(null);

    if (!isDraft) {
      setQuestionValidationError(
        'Publiserte og lukkede skjemaer kan ikke endres her.',
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

    try {
      await addQuestion.mutateAsync({
        surveyId: survey.id,
        sectionId: selectedSectionId,
        type,
        prompt,
        description,
        isRequired,
        allowMultiple,
        optionLabels,
      });
    } catch {
      return;
    }

    setPrompt('');
    setDescription('');
    setAllowMultiple(false);
    setOptionText('Ja\nNei');
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
        <Panel title="Status" subtitle={statusLabel[survey.status]} />
        <Panel title="Besvarelser" subtitle={responseModeLabel[survey.responseMode]} />
        <Panel title="Spørsmål" subtitle={`${survey.questions.length} totalt`} />
      </div>

      <Panel title="Grunninfo" subtitle={formatSurveyWindow(survey)}>
        {survey.description ? <p>{survey.description}</p> : null}
        <div className="status-row">
          <span className={`status-pill status-pill--${survey.status}`}>
            {statusLabel[survey.status]}
          </span>
          <span>{survey.slug}</span>
        </div>
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
                disabled={!isDraft || addSection.isPending}
                placeholder="Om arbeidsmiljøet"
                onChange={(event) => setSectionTitle(event.target.value)}
              />
            </label>
            <label>
              Beskrivelse
              <input
                type="text"
                value={sectionDescription}
                disabled={!isDraft || addSection.isPending}
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
              disabled={!isDraft || addSection.isPending}
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
                  disabled={!isDraft || deleteSection.isPending}
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
                disabled={!isDraft || addQuestion.isPending}
                onChange={(event) => setType(event.target.value as QuestionType)}
              >
                <option value="multiple_choice">Flervalg</option>
                <option value="free_text">Fritekst</option>
                <option value="likert_1_5">Likert 1-5</option>
              </select>
            </label>
            {survey.sections.length > 0 ? (
              <label>
                Seksjon
                <select
                  value={selectedSectionId ?? 'none'}
                  disabled={!isDraft || addQuestion.isPending}
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
                disabled={!isDraft || addQuestion.isPending}
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
              disabled={!isDraft || addQuestion.isPending}
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
                disabled={!isDraft || addQuestion.isPending}
                onChange={(event) => setOptionText(event.target.value)}
              />
            </label>
          ) : null}
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={isRequired}
                disabled={!isDraft || addQuestion.isPending}
                onChange={(event) => setIsRequired(event.target.checked)}
              />
              Påkrevd
            </label>
            {type === 'multiple_choice' ? (
              <label>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  disabled={!isDraft || addQuestion.isPending}
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
              disabled={!isDraft || addQuestion.isPending}
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
                  disabled={!isDraft || deleteQuestion.isPending}
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
        {question.type === 'free_text' ? (
          <Type size={20} />
        ) : question.type === 'likert_1_5' ? (
          <CheckCircle2 size={20} />
        ) : (
          <ListChecks size={20} />
        )}
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
          <span>{questionTypeLabels[question.type]}</span>
          <span>{question.isRequired ? 'Påkrevd' : 'Valgfri'}</span>
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Noe gikk galt i skjemabyggeren.';
}
