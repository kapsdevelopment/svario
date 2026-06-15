import { useParams } from 'react-router-dom';
import { CheckCircle2, ListChecks, Type } from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

import { usePublishedSurvey } from '../../../application/surveys/usePublishedSurvey';
import { useSubmitSurveyResponse } from '../../../application/surveys/useSubmitSurveyResponse';
import {
  getQuestionScaleValues,
  type PublishedSurvey,
  type SurveyQuestion,
  type SurveySection,
  type SubmitSurveyAnswerInput,
} from '../../../domain/surveys/survey';
import { Panel } from '../../shared/components/Panel';

export function RespondentPage() {
  const { slug } = useParams();
  const { data: survey, error, isError, isLoading } = usePublishedSurvey(slug);

  if (!slug) {
    return (
      <main className="respondent-page image-page image-page--fjord">
        <div className="respondent-card">
          <Panel title="Skjemaet mangler" subtitle="Lenken er ikke komplett." />
        </div>
      </main>
    );
  }

  return (
    <main className="respondent-page image-page image-page--fjord">
      <div className="respondent-card">
        <p className="eyebrow">Svario</p>
        {isLoading ? (
          <Panel title="Laster skjema" subtitle="Henter spørsmålene." />
        ) : null}

        {isError ? (
          <Panel title="Skjemaet er ikke tilgjengelig" subtitle={slug}>
            <div className="form-alert form-alert--error" role="alert">
              {getRespondentErrorMessage(error)}
            </div>
          </Panel>
        ) : null}

        {survey ? <PublishedSurveyForm survey={survey} /> : null}
      </div>
    </main>
  );
}

function PublishedSurveyForm({ survey }: { survey: PublishedSurvey }) {
  const submitResponse = useSubmitSurveyResponse();
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const questionGroups = groupQuestionsBySection(
    survey.sections,
    survey.questions,
  );
  const isIdentified = survey.responseMode === 'identified';
  const isSubmitted = submitResponse.isSuccess;
  const canSubmit = survey.questions.length > 0 && !isSubmitted;
  const submittedLabel = useMemo(
    () => `Svar ${submitResponse.data?.slice(0, 8) ?? ''}`,
    [submitResponse.data],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (isIdentified && !respondentName.trim() && !respondentEmail.trim()) {
      setValidationError('Skriv inn navn eller e-post før du sender inn.');
      return;
    }

    const result = buildSubmitAnswers(survey.questions, answers);

    if (!result.ok) {
      setValidationError(result.message);
      return;
    }

    try {
      await submitResponse.mutateAsync({
        surveySlug: survey.slug,
        answers: result.answers,
        respondentName: isIdentified ? respondentName : null,
        respondentEmail: isIdentified ? respondentEmail : null,
        metadata: { source: 'svario-web' },
      });
    } catch {
      return;
    }
  }

  function updateAnswer(questionId: string, answer: DraftAnswer) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));
  }

  return (
    <Panel title={survey.title} subtitle={formatSurveyMeta(survey)}>
      {isSubmitted ? (
        <div className="receipt-state" role="status">
          <CheckCircle2 size={34} aria-hidden="true" />
          <div>
            <h2>Takk for svaret</h2>
            <p>{submittedLabel}</p>
          </div>
        </div>
      ) : null}

      <form className="respondent-form" onSubmit={handleSubmit}>
        {survey.description ? (
          <p className="respondent-form__description">{survey.description}</p>
        ) : null}

        {isIdentified ? (
          <div className="respondent-identity">
            <label>
              Navn
              <input
                type="text"
                value={respondentName}
                disabled={isSubmitted || submitResponse.isPending}
                autoComplete="name"
                placeholder="Ola Nordmann"
                onChange={(event) => setRespondentName(event.target.value)}
              />
            </label>
            <label>
              E-post
              <input
                type="email"
                value={respondentEmail}
                disabled={isSubmitted || submitResponse.isPending}
                autoComplete="email"
                placeholder="ola@example.no"
                onChange={(event) => setRespondentEmail(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {questionGroups.map((group) => (
          <section className="respondent-section" key={group.id}>
            <div className="respondent-section__header">
              <h2>{group.title}</h2>
              {group.description ? <p>{group.description}</p> : null}
            </div>
            {group.questions.map((question) => (
              <RespondentQuestion
                key={question.id}
                answer={answers[question.id] ?? emptyDraftAnswer}
                disabled={isSubmitted || submitResponse.isPending}
                question={question}
                onChange={(answer) => updateAnswer(question.id, answer)}
              />
            ))}
          </section>
        ))}

        {survey.questions.length === 0 ? (
          <div className="empty-state">
            <ListChecks size={28} aria-hidden="true" />
            <p>Dette skjemaet har ingen spørsmål ennå.</p>
          </div>
        ) : null}

        {validationError ? (
          <div className="form-alert form-alert--error" role="alert">
            {validationError}
          </div>
        ) : null}

        {submitResponse.isError ? (
          <div className="form-alert form-alert--error" role="alert">
            {getSubmitErrorMessage(submitResponse.error)}
          </div>
        ) : null}

        <div className="form-actions">
          <button
            className="button button--primary"
            type="submit"
            disabled={!canSubmit || submitResponse.isPending}
          >
            {submitResponse.isPending ? 'Sender inn...' : 'Send inn'}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function RespondentQuestion({
  answer,
  disabled,
  onChange,
  question,
}: {
  answer: DraftAnswer;
  disabled: boolean;
  onChange: (answer: DraftAnswer) => void;
  question: SurveyQuestion;
}) {
  if (question.type === 'free_text') {
    return (
      <article className="respondent-question">
        <QuestionHeader question={question} icon={<Type size={20} />} />
        <textarea
          rows={4}
          name={question.id}
          value={answer.freeText}
          disabled={disabled}
          required={question.isRequired}
          placeholder="Skriv svaret ditt her"
          onChange={(event) =>
            onChange({ ...answer, freeText: event.target.value })
          }
        />
      </article>
    );
  }

  if (question.type === 'likert_scale') {
    const scaleValues = getQuestionScaleValues(question);

    return (
      <article className="respondent-question">
        <QuestionHeader question={question} icon={<CheckCircle2 size={20} />} />
        <fieldset className="likert">
          <legend className="sr-only">{question.prompt}</legend>
          <div className="likert__options">
            {scaleValues.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name={question.id}
                  value={value}
                  checked={answer.likertValue === value}
                  disabled={disabled}
                  required={question.isRequired}
                  onChange={() => onChange({ ...answer, likertValue: value })}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </article>
    );
  }

  return (
    <article className="respondent-question">
      <QuestionHeader question={question} icon={<ListChecks size={20} />} />
      <div className="choice-list">
        {question.options.map((option) => (
          <label key={option.id}>
            <input
              type={question.allowMultiple ? 'checkbox' : 'radio'}
              name={question.id}
              value={option.id}
              checked={answer.optionIds.includes(option.id)}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...answer,
                  optionIds: nextOptionIds(
                    answer.optionIds,
                    option.id,
                    event.target.checked,
                    question.allowMultiple,
                  ),
                })
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </article>
  );
}

type DraftAnswer = {
  freeText: string;
  likertValue: number | null;
  optionIds: string[];
};

type BuildSubmitAnswersResult =
  | {
      ok: true;
      answers: SubmitSurveyAnswerInput[];
    }
  | {
      ok: false;
      message: string;
    };

const emptyDraftAnswer: DraftAnswer = {
  freeText: '',
  likertValue: null,
  optionIds: [],
};

function buildSubmitAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, DraftAnswer>,
): BuildSubmitAnswersResult {
  const submitAnswers: SubmitSurveyAnswerInput[] = [];

  for (const question of questions) {
    const answer = answers[question.id] ?? emptyDraftAnswer;

    if (question.type === 'free_text') {
      const freeText = answer.freeText.trim();

      if (question.isRequired && !freeText) {
        return missingRequiredAnswer(question);
      }

      if (freeText) {
        submitAnswers.push({ questionId: question.id, freeText });
      }
      continue;
    }

    if (question.type === 'likert_scale') {
      if (question.isRequired && answer.likertValue === null) {
        return missingRequiredAnswer(question);
      }

      if (answer.likertValue !== null) {
        submitAnswers.push({
          questionId: question.id,
          likertValue: answer.likertValue,
        });
      }
      continue;
    }

    if (question.isRequired && answer.optionIds.length === 0) {
      return missingRequiredAnswer(question);
    }

    if (answer.optionIds.length > 0) {
      submitAnswers.push({
        questionId: question.id,
        optionIds: answer.optionIds,
      });
    }
  }

  return { ok: true, answers: submitAnswers };
}

function missingRequiredAnswer(question: SurveyQuestion): BuildSubmitAnswersResult {
  return {
    ok: false,
    message: `Svar på "${question.prompt}" før du sender inn.`,
  };
}

function nextOptionIds(
  currentOptionIds: string[],
  optionId: string,
  checked: boolean,
  allowMultiple: boolean,
) {
  if (!allowMultiple) {
    return checked ? [optionId] : [];
  }

  if (checked) {
    return currentOptionIds.includes(optionId)
      ? currentOptionIds
      : [...currentOptionIds, optionId];
  }

  return currentOptionIds.filter((currentOptionId) => currentOptionId !== optionId);
}

function QuestionHeader({
  icon,
  question,
}: {
  icon: ReactNode;
  question: SurveyQuestion;
}) {
  return (
    <div className="respondent-question__header">
      <div className="question-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h2>{question.prompt}</h2>
        {question.description ? <p>{question.description}</p> : null}
        <span>{question.isRequired ? 'Påkrevd' : 'Valgfri'}</span>
      </div>
    </div>
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
      title: sections.length === 0 ? 'Spørsmål' : 'Uten seksjon',
      description: null,
      questions: unsectionedQuestions,
    });
  }

  return groups.filter((group) => group.questions.length > 0);
}

function formatSurveyMeta(survey: PublishedSurvey) {
  const responseMode =
    survey.responseMode === 'anonymous' ? 'Anonyme svar' : 'Identifiserte svar';

  if (survey.endsAt) {
    return `${responseMode} · åpent til ${formatDate(survey.endsAt)}`;
  }

  return responseMode;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getRespondentErrorMessage(_error: unknown) {
  if (_error instanceof Error && _error.message) {
    return 'Lenken finnes ikke, eller skjemaet er ikke åpent for svar.';
  }

  return 'Lenken finnes ikke, eller skjemaet er ikke åpent for svar.';
}

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Kunne ikke sende inn svaret akkurat nå.';
}
