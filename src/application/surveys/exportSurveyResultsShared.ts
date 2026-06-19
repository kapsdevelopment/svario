import type {
  SurveyLikertResult,
  SurveyQuestionResult,
  SurveyResults,
} from '../../domain/surveys/survey';

export const exportColors = {
  ink: '17201d',
  pine: '183a34',
  moss: '4f6c5d',
  muted: '607681',
  line: 'd9d3c7',
  paper: 'fffdf8',
  soft: 'f3f0e8',
  white: 'ffffff',
  fjord: '375c68',
  rust: 'b86b3b',
  gold: 'c2933a',
};

export const statusLabel = {
  closed: 'Lukket',
  draft: 'Utkast',
  published: 'Publisert',
} satisfies Record<SurveyResults['status'], string>;

export function createSurveyResultsExportFileName(
  results: Pick<SurveyResults, 'slug' | 'title'>,
  descriptor: string,
  extension: string,
  generatedAt = new Date(),
) {
  const fileStem = sanitizeFileNamePart(results.slug || results.title || 'svario');
  return `${fileStem}-${descriptor}-${formatDateStamp(generatedAt)}.${extension}`;
}

export function getResponseModeLabel(responseMode: SurveyResults['responseMode']) {
  return responseMode === 'anonymous'
    ? 'Anonyme besvarelser'
    : 'Identifiserte besvarelser';
}

const questionTypeLabel = {
  free_text: 'Fritekst',
  likert_scale: 'Skala',
  multiple_choice: 'Flervalg',
} satisfies Record<SurveyQuestionResult['question']['type'], string>;

export function getQuestionTypeLabel(question: SurveyQuestionResult['question']) {
  if (question.type !== 'likert_scale') {
    return questionTypeLabel[question.type];
  }

  if (question.scaleVariant === 'stars') {
    return 'Stjerner';
  }

  if (question.scaleVariant === 'nps') {
    return 'NPS';
  }

  return questionTypeLabel.likert_scale;
}

export function formatQuestionResultMeta(
  result: SurveyQuestionResult,
  responseCount: number,
) {
  return `${getQuestionTypeLabel(result.question)} - ${result.answeredCount}/${responseCount} besvart`;
}

export function formatLikertSummary(
  results: SurveyLikertResult[],
  average: number | null,
  scaleVariant: SurveyQuestionResult['question']['scaleVariant'],
) {
  if (scaleVariant !== 'nps') {
    return `Gjennomsnitt: ${
      average === null ? 'Ingen svar' : average.toLocaleString('nb-NO')
    }`;
  }

  const summary = calculateNpsSummary(results);

  if (summary.score === null) {
    return 'NPS: Ingen svar';
  }

  return `NPS: ${summary.score} (${summary.promoters} promotører, ${summary.passives} passive, ${summary.detractors} kritikere)`;
}

export function calculateNpsSummary(results: SurveyLikertResult[]) {
  const total = results.reduce((sum, result) => sum + result.count, 0);
  const promoters = sumNpsGroup(results, (value) => value >= 9);
  const passives = sumNpsGroup(results, (value) => value >= 7 && value <= 8);
  const detractors = sumNpsGroup(results, (value) => value <= 6);
  const score =
    total === 0 ? null : Math.round(((promoters - detractors) / total) * 100);

  return {
    detractors,
    passives,
    promoters,
    score,
  };
}

export function formatSurveyWindow(
  results: Pick<SurveyResults, 'endsAt' | 'startsAt'>,
) {
  if (!results.startsAt && !results.endsAt) {
    return 'Ingen tidsavgrensning';
  }

  const startsAt = results.startsAt ? formatDateTime(results.startsAt) : 'Uten start';
  const endsAt = results.endsAt ? formatDateTime(results.endsAt) : 'Uten slutt';
  return `${startsAt} - ${endsAt}`;
}

export function formatPercentage(value: number) {
  return `${value} %`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Ukjent tidspunkt';
  }

  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function sanitizeFileNamePart(value: string) {
  const normalizedValue = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nb-NO')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');

  return normalizedValue || 'svario';
}

function sumNpsGroup(
  results: SurveyLikertResult[],
  predicate: (value: number) => boolean,
) {
  return results
    .filter((result) => predicate(result.value))
    .reduce((sum, result) => sum + result.count, 0);
}

function formatDateStamp(value: Date) {
  const year = value.getFullYear();
  const month = padDatePart(value.getMonth() + 1);
  const day = padDatePart(value.getDate());
  const hour = padDatePart(value.getHours());
  const minute = padDatePart(value.getMinutes());

  return `${year}${month}${day}-${hour}${minute}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}
