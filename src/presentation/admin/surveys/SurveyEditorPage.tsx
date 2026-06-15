import {
  ArrowLeft,
  CheckCircle2,
  ListChecks,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAddSurveyQuestion } from '../../../application/surveys/useAddSurveyQuestion';
import { useDeleteSurveyQuestion } from '../../../application/surveys/useDeleteSurveyQuestion';
import { useSurveyEditor } from '../../../application/surveys/useSurveyEditor';
import type {
  QuestionType,
  SurveyQuestion,
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

function SurveyEditorContent({ survey }: { survey: SurveySummary & { questions: SurveyQuestion[] } }) {
  const addQuestion = useAddSurveyQuestion(survey.id);
  const deleteQuestion = useDeleteSurveyQuestion(survey.id);

  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [optionText, setOptionText] = useState('Ja\nNei');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDraft = survey.status === 'draft';
  const optionLabels = useMemo(
    () => optionText.split('\n').map((line) => line.trim()).filter(Boolean),
    [optionText],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (!isDraft) {
      setValidationError('Publiserte og lukkede skjemaer kan ikke endres her.');
      return;
    }

    if (!prompt.trim()) {
      setValidationError('Spørsmålet må ha en tekst.');
      return;
    }

    if (type === 'multiple_choice' && optionLabels.length < 2) {
      setValidationError('Flervalgsspørsmål må ha minst to alternativer.');
      return;
    }

    try {
      await addQuestion.mutateAsync({
        surveyId: survey.id,
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

      <Panel title="Legg til spørsmål">
        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--two">
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
          {validationError ? (
            <div className="form-alert form-alert--error" role="alert">
              {validationError}
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
          {survey.questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              disabled={!isDraft || deleteQuestion.isPending}
              onDelete={handleDelete}
            />
          ))}
          {survey.questions.length === 0 ? (
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
