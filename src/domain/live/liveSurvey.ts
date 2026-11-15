import type {
  QuestionVisualizationColorMode,
  QuestionScaleVariant,
  SurveyChoiceResult,
  SurveyEditor,
  SurveyPrivacySettings,
} from '../surveys/survey';

export type LiveSurveyStatus = 'lobby' | 'question' | 'closed';

type LiveSurveyOption = { id: string; label: string };

export type LiveSurveyQuestion = {
  id: string;
  prompt: string;
  description: string | null;
  chartType: 'bar' | 'pie';
  colorMode: QuestionVisualizationColorMode;
} & (
  | { scaleVariant?: null; options: LiveSurveyOption[] }
  | { scaleVariant: QuestionScaleVariant; options: Array<LiveSurveyOption & { value: number }> }
);

export type LiveSurveyResult = {
  step: number;
  question: LiveSurveyQuestion;
  counts: Record<string, number>;
};

type LiveSurveyState = {
  title: string;
  status: LiveSurveyStatus;
  step: number;
  questionCount: number;
};

export type LiveSurveyHostState = LiveSurveyState & {
  id: string;
  surveyId: string;
  results: LiveSurveyResult[];
};

export type LiveSurveyParticipantState = LiveSurveyState & {
  question: LiveSurveyQuestion | null;
  selectedOptionId: string | null;
  privacy: Pick<
    SurveyPrivacySettings,
    'controllerName' | 'controllerContact' | 'purpose' | 'legalBasis' | 'retentionDays' | 'respondentNotice'
  >;
};

export type LiveSurveySummary = {
  id: string;
  createdAt: string;
  status: LiveSurveyStatus;
};

export function getLiveSurveyEligibilityIssue(survey: SurveyEditor) {
  if (survey.status !== 'published' && !(survey.liveOnly && survey.status === 'draft')) {
    return 'Publiser skjemaet for å kunne holde en liveøkt.';
  }
  if (survey.responseMode !== 'anonymous') {
    return 'Liveøkter krever at svarmodus er satt til anonym.';
  }
  const privacy = survey.privacySettings;
  if (privacy?.enabled && (privacy.personalDataExpected || privacy.legalBasis === 'consent')) {
    return 'Liveøkter støtter skjema uten personopplysninger eller krav om samtykke.';
  }
  if (survey.questions.length === 0 || survey.questions.length > 250) {
    return 'Liveøkter krever mellom 1 og 250 spørsmål.';
  }
  if (survey.questions.some((question) =>
    question.type !== 'likert_scale' &&
    (question.type !== 'multiple_choice' || question.allowMultiple || question.options.length < 2),
  )) {
    return 'Bruk skala eller flervalg med minst to svaralternativer og «Flere valg» avslått.';
  }
  const now = Date.now();
  if (
    (survey.startsAt && Date.parse(survey.startsAt) > now) ||
    (survey.endsAt && Date.parse(survey.endsAt) <= now)
  ) {
    return 'Liveøkten kan startes mens skjemaet er åpent for svar.';
  }
  return null;
}

export function getLiveSurveyResults({ question, counts }: LiveSurveyResult) {
  const total = question.options.reduce((sum, option) => sum + (counts[option.id] ?? 0), 0);
  const results: SurveyChoiceResult[] = question.options.map((option) => {
    const count = counts[option.id] ?? 0;
    return {
      optionId: option.id,
      label: option.label,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
  if (!question.scaleVariant) {
    return { total, results, scale: null };
  }

  const scaleResults = question.options.map(({ value }, index) => ({
    value,
    count: results[index].count,
    percentage: results[index].percentage,
  }));
  const sum = scaleResults.reduce((sum, { count, value }) => sum + count * value, 0);
  return {
    total,
    results,
    scale: {
      variant: question.scaleVariant,
      results: scaleResults,
      average: total === 0 ? null : Number((sum / total).toFixed(1)),
    },
  };
}

export function isLiveSurveyId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value));
}
