import { unparse } from 'papaparse';

import type {
  SurveyQuestion,
  SurveyResponseResult,
  SurveyResults,
} from '../../domain/surveys/survey';

const metadataFields = ['response_id', 'submitted_at'] as const;
const identifiedRespondentFields = [
  'respondent_name',
  'respondent_email',
] as const;

type CsvRow = Record<string, string>;

export function buildSurveyResultsCsv(results: SurveyResults) {
  const questionColumns = results.questionResults.map((result, index) => ({
    header: `Q${index + 1}: ${result.question.prompt}`,
    question: result.question,
  }));
  const respondentFields =
    results.responseMode === 'identified' ? identifiedRespondentFields : [];
  const fields = [
    ...metadataFields,
    ...respondentFields,
    ...questionColumns.map((column) => column.header),
  ];
  const rows = results.responses.map((response) => {
    const row: CsvRow = {
      response_id: response.id,
      submitted_at: response.submittedAt,
    };

    if (results.responseMode === 'identified') {
      row.respondent_name = response.respondentName ?? '';
      row.respondent_email = response.respondentEmail ?? '';
    }

    for (const column of questionColumns) {
      row[column.header] = formatResponseAnswer(response, column.question);
    }

    return row;
  });

  return unparse({ fields, data: rows });
}

export function createSurveyResultsCsvFileName(
  results: Pick<SurveyResults, 'slug' | 'title'>,
  generatedAt = new Date(),
) {
  const fileStem = sanitizeFileNamePart(results.slug || results.title || 'svario');
  return `${fileStem}-responses-${formatDateStamp(generatedAt)}.csv`;
}

function formatResponseAnswer(
  response: SurveyResponseResult,
  question: SurveyQuestion,
) {
  const answer = response.answers.find(
    (currentAnswer) => currentAnswer.questionId === question.id,
  );

  if (!answer) {
    return '';
  }

  if (question.type === 'free_text') {
    return answer.freeText ?? '';
  }

  if (question.type === 'likert_scale') {
    return answer.likertValue === null ? '' : String(answer.likertValue);
  }

  const selectedOptionIds = new Set(answer.optionIds);
  const knownOptionIds = new Set(question.options.map((option) => option.id));
  const labels = question.options
    .filter((option) => selectedOptionIds.has(option.id))
    .map((option) => option.label);
  const unknownOptionIds = answer.optionIds.filter(
    (optionId) => !knownOptionIds.has(optionId),
  );

  return [...labels, ...unknownOptionIds].join('; ');
}

function sanitizeFileNamePart(value: string) {
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
