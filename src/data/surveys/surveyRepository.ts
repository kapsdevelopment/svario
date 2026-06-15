import {
  getQuestionScaleValues,
  questionScaleDefaults,
  questionScaleLimits,
  type AddSurveySectionInput,
  type AddSurveyQuestionInput,
  type CreateSurveyDraftInput,
  type PublishedSurvey,
  type QuestionType,
  type SubmitSurveyResponseInput,
  type SurveyEditor,
  type SurveyFreeTextResult,
  type SurveyLikertResult,
  type SurveyQuestion,
  type SurveyQuestionOption,
  type SurveyQuestionResult,
  type SurveyResults,
  type SurveySection,
  type SurveySummary,
} from '../../domain/surveys/survey';
import { publicSupabase, supabase } from '../supabase/client';
import type { Json, Tables, TablesInsert } from '../supabase/database.types';

type SurveyRow = Pick<
  Tables<'surveys'>,
  | 'id'
  | 'title'
  | 'description'
  | 'slug'
  | 'status'
  | 'response_mode'
  | 'starts_at'
  | 'ends_at'
  | 'published_at'
  | 'created_at'
  | 'updated_at'
>;

type QuestionRow = Pick<
  Tables<'questions'>,
  | 'id'
  | 'survey_id'
  | 'section_id'
  | 'type'
  | 'prompt'
  | 'description'
  | 'is_required'
  | 'allow_multiple'
  | 'scale_min'
  | 'scale_max'
  | 'sort_order'
>;

type SectionRow = Pick<
  Tables<'survey_sections'>,
  'id' | 'survey_id' | 'title' | 'description' | 'sort_order'
>;

type QuestionOptionRow = Pick<
  Tables<'question_options'>,
  'id' | 'question_id' | 'label' | 'value' | 'sort_order'
>;

type SurveyResponseRow = Pick<
  Tables<'survey_responses'>,
  | 'id'
  | 'survey_id'
  | 'response_mode'
  | 'respondent_name'
  | 'respondent_email'
  | 'submitted_at'
>;

type AnswerRow = Pick<
  Tables<'answers'>,
  'id' | 'response_id' | 'question_id' | 'free_text' | 'likert_value'
>;

type AnswerOptionRow = Pick<
  Tables<'answer_options'>,
  'answer_id' | 'option_id'
>;

const surveySummarySelect =
  'id, title, description, slug, status, response_mode, starts_at, ends_at, published_at, created_at, updated_at';
const sectionSelect = 'id, survey_id, title, description, sort_order';
const questionSelect =
  'id, survey_id, section_id, type, prompt, description, is_required, allow_multiple, scale_min, scale_max, sort_order';
const questionOptionSelect = 'id, question_id, label, value, sort_order';
const surveyResponseSelect =
  'id, survey_id, response_mode, respondent_name, respondent_email, submitted_at';
const answerSelect = 'id, response_id, question_id, free_text, likert_value';
const answerOptionSelect = 'answer_id, option_id';

export async function listMySurveys(): Promise<SurveySummary[]> {
  const client = requireSurveyClient();
  const { data, error } = await client
    .from('surveys')
    .select(surveySummarySelect)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSurveySummary);
}

export async function createSurveyDraft(
  input: CreateSurveyDraftInput,
): Promise<SurveySummary> {
  const client = requireSurveyClient();
  const title = input.title.trim();

  if (!title) {
    throw new Error('Skjemaet må ha en tittel.');
  }

  const payload: TablesInsert<'surveys'> = {
    owner_account_id: input.ownerAccountId,
    title,
    description: normalizeOptionalText(input.description),
    slug: createSurveySlug(title),
    status: 'draft',
    response_mode: input.responseMode,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  };

  const { data, error } = await client
    .from('surveys')
    .insert(payload)
    .select(surveySummarySelect)
    .single();

  if (error) {
    throw error;
  }

  return mapSurveySummary(data);
}

export async function getSurveyEditor(surveyId: string): Promise<SurveyEditor> {
  const client = requireSurveyClient();

  const { data: survey, error: surveyError } = await client
    .from('surveys')
    .select(surveySummarySelect)
    .eq('id', surveyId)
    .single();

  if (surveyError) {
    throw surveyError;
  }

  const { data: sections, error: sectionsError } = await client
    .from('survey_sections')
    .select(sectionSelect)
    .eq('survey_id', surveyId)
    .order('sort_order', { ascending: true });

  if (sectionsError) {
    throw sectionsError;
  }

  const { data: questions, error: questionsError } = await client
    .from('questions')
    .select(questionSelect)
    .eq('survey_id', surveyId)
    .order('sort_order', { ascending: true });

  if (questionsError) {
    throw questionsError;
  }

  const questionIds = (questions ?? []).map((question) => question.id);
  const options = await listQuestionOptions(questionIds);

  return {
    ...mapSurveySummary(survey),
    sections: (sections ?? []).map(mapSection),
    questions: (questions ?? []).map((question) =>
      mapQuestion(question, options.get(question.id) ?? []),
    ),
  };
}

export async function publishSurvey(surveyId: string): Promise<SurveySummary> {
  const client = requireSurveyClient();
  const { count, error: countError } = await client
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) === 0) {
    throw new Error('Skjemaet må ha minst ett spørsmål før publisering.');
  }

  const { data, error } = await client
    .from('surveys')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', surveyId)
    .eq('status', 'draft')
    .select(surveySummarySelect)
    .single();

  if (error) {
    throw error;
  }

  return mapSurveySummary(data);
}

export async function getPublishedSurveyBySlug(
  slug: string,
): Promise<PublishedSurvey> {
  const client = requirePublicSurveyClient();
  const normalizedSlug = slug.trim().toLocaleLowerCase('nb-NO');

  const { data: survey, error: surveyError } = await client
    .from('surveys')
    .select(
      'id, title, description, slug, status, response_mode, starts_at, ends_at, published_at',
    )
    .eq('slug', normalizedSlug)
    .single();

  if (surveyError) {
    throw surveyError;
  }

  const { data: sections, error: sectionsError } = await client
    .from('survey_sections')
    .select(sectionSelect)
    .eq('survey_id', survey.id)
    .order('sort_order', { ascending: true });

  if (sectionsError) {
    throw sectionsError;
  }

  const { data: questions, error: questionsError } = await client
    .from('questions')
    .select(questionSelect)
    .eq('survey_id', survey.id)
    .order('sort_order', { ascending: true });

  if (questionsError) {
    throw questionsError;
  }

  const questionIds = (questions ?? []).map((question) => question.id);
  const options = await listQuestionOptions(questionIds, client);

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    slug: survey.slug,
    status: survey.status,
    responseMode: survey.response_mode,
    startsAt: survey.starts_at,
    endsAt: survey.ends_at,
    publishedAt: survey.published_at,
    sections: (sections ?? []).map(mapSection),
    questions: (questions ?? []).map((question) =>
      mapQuestion(question, options.get(question.id) ?? []),
    ),
  };
}

export async function submitSurveyResponse(
  input: SubmitSurveyResponseInput,
): Promise<string> {
  const client = requirePublicSurveyClient();
  const { data, error } = await client.rpc('submit_survey_response', {
    p_survey_slug: input.surveySlug,
    p_answers: input.answers.map((answer) => ({
      questionId: answer.questionId,
      freeText: answer.freeText ?? null,
      likertValue: answer.likertValue ?? null,
      optionIds: answer.optionIds ?? [],
    })) as Json,
    p_respondent_name: normalizeOptionalText(input.respondentName),
    p_respondent_email: normalizeOptionalText(input.respondentEmail),
    p_metadata: (input.metadata ?? {}) as Json,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getSurveyResults(surveyId: string): Promise<SurveyResults> {
  const editor = await getSurveyEditor(surveyId);
  const responses = await listSurveyResponses(surveyId);
  const responseIds = responses.map((response) => response.id);
  const answers = await listAnswers(responseIds);
  const answerIds = answers.map((answer) => answer.id);
  const answerOptions = await listAnswerOptions(answerIds);
  const { questions, ...survey } = editor;

  return {
    ...survey,
    responseCount: responses.length,
    lastSubmittedAt: responses[0]?.submitted_at ?? null,
    questionResults: buildQuestionResults(questions, responses, answers, answerOptions),
  };
}

export async function addSurveySection(
  input: AddSurveySectionInput,
): Promise<SurveySection> {
  const client = requireSurveyClient();
  const title = input.title.trim();

  if (!title) {
    throw new Error('Seksjonen må ha en tittel.');
  }

  const { data, error } = await client
    .from('survey_sections')
    .insert({
      survey_id: input.surveyId,
      title,
      description: normalizeOptionalText(input.description),
      sort_order: await getNextSectionSortOrder(input.surveyId),
    })
    .select(sectionSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapSection(data);
}

export async function deleteSurveySection(sectionId: string): Promise<void> {
  const client = requireSurveyClient();
  const { error } = await client
    .from('survey_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    throw error;
  }
}

export async function addSurveyQuestion(
  input: AddSurveyQuestionInput,
): Promise<SurveyQuestion> {
  const client = requireSurveyClient();
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error('Spørsmålet må ha en tekst.');
  }

  const optionLabels =
    input.type === 'multiple_choice' ? normalizeOptionLabels(input.optionLabels) : [];

  if (input.type === 'multiple_choice' && optionLabels.length < 2) {
    throw new Error('Flervalgsspørsmål må ha minst to alternativer.');
  }

  const scale =
    input.type === 'likert_scale'
      ? normalizeQuestionScale(input.scaleMin, input.scaleMax)
      : { scaleMin: null, scaleMax: null };

  const sortOrder = await getNextQuestionSortOrder(input.surveyId);
  const questionPayload: TablesInsert<'questions'> = {
    survey_id: input.surveyId,
    section_id: input.sectionId,
    type: input.type,
    prompt,
    description: normalizeOptionalText(input.description),
    is_required: input.isRequired,
    allow_multiple: input.type === 'multiple_choice' ? input.allowMultiple : false,
    scale_min: scale.scaleMin,
    scale_max: scale.scaleMax,
    sort_order: sortOrder,
  };

  const { data: question, error: questionError } = await client
    .from('questions')
    .insert(questionPayload)
    .select(questionSelect)
    .single();

  if (questionError) {
    throw questionError;
  }

  try {
    const options = await insertQuestionOptions(question.id, optionLabels);
    return mapQuestion(question, options);
  } catch (error) {
    await client.from('questions').delete().eq('id', question.id);
    throw error;
  }
}

export async function deleteSurveyQuestion(questionId: string): Promise<void> {
  const client = requireSurveyClient();
  const { error } = await client.from('questions').delete().eq('id', questionId);

  if (error) {
    throw error;
  }
}

function mapSurveySummary(row: SurveyRow): SurveySummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    status: row.status,
    responseMode: row.response_mode,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSection(row: SectionRow): SurveySection {
  return {
    id: row.id,
    surveyId: row.survey_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function mapQuestion(
  row: QuestionRow,
  options: SurveyQuestionOption[],
): SurveyQuestion {
  const type = mapQuestionType(row.type);

  return {
    id: row.id,
    surveyId: row.survey_id,
    sectionId: row.section_id,
    type,
    prompt: row.prompt,
    description: row.description,
    isRequired: row.is_required,
    allowMultiple: row.allow_multiple,
    scaleMin:
      type === 'likert_scale'
        ? row.scale_min ?? questionScaleDefaults.min
        : null,
    scaleMax:
      type === 'likert_scale'
        ? row.scale_max ?? questionScaleDefaults.max
        : null,
    sortOrder: row.sort_order,
    options,
  };
}

function mapQuestionType(type: QuestionRow['type']): QuestionType {
  if (type === 'likert_1_5') {
    return 'likert_scale';
  }

  return type;
}

function mapQuestionOption(row: QuestionOptionRow): SurveyQuestionOption {
  return {
    id: row.id,
    questionId: row.question_id,
    label: row.label,
    value: row.value,
    sortOrder: row.sort_order,
  };
}

async function listQuestionOptions(
  questionIds: string[],
  client = requireSurveyClient(),
) {
  if (questionIds.length === 0) {
    return new Map<string, SurveyQuestionOption[]>();
  }

  const { data, error } = await client
    .from('question_options')
    .select(questionOptionSelect)
    .in('question_id', questionIds)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  const optionsByQuestion = new Map<string, SurveyQuestionOption[]>();

  for (const option of data ?? []) {
    const mappedOption = mapQuestionOption(option);
    const existingOptions = optionsByQuestion.get(mappedOption.questionId) ?? [];
    existingOptions.push(mappedOption);
    optionsByQuestion.set(mappedOption.questionId, existingOptions);
  }

  return optionsByQuestion;
}

async function listSurveyResponses(surveyId: string): Promise<SurveyResponseRow[]> {
  const client = requireSurveyClient();
  const { data, error } = await client
    .from('survey_responses')
    .select(surveyResponseSelect)
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listAnswers(responseIds: string[]): Promise<AnswerRow[]> {
  if (responseIds.length === 0) {
    return [];
  }

  const client = requireSurveyClient();
  const { data, error } = await client
    .from('answers')
    .select(answerSelect)
    .in('response_id', responseIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listAnswerOptions(answerIds: string[]): Promise<AnswerOptionRow[]> {
  if (answerIds.length === 0) {
    return [];
  }

  const client = requireSurveyClient();
  const { data, error } = await client
    .from('answer_options')
    .select(answerOptionSelect)
    .in('answer_id', answerIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function buildQuestionResults(
  questions: SurveyQuestion[],
  responses: SurveyResponseRow[],
  answers: AnswerRow[],
  answerOptions: AnswerOptionRow[],
): SurveyQuestionResult[] {
  const answersByQuestion = groupBy(answers, (answer) => answer.question_id);
  const answerOptionsByAnswer = groupBy(
    answerOptions,
    (answerOption) => answerOption.answer_id,
  );
  const responseById = new Map(
    responses.map((response) => [response.id, response]),
  );

  return questions.map((question) => {
    const questionAnswers = answersByQuestion.get(question.id) ?? [];
    const answeredCount = questionAnswers.length;
    const skippedCount = Math.max(0, responses.length - answeredCount);

    return {
      question,
      answeredCount,
      skippedCount,
      choiceResults: buildChoiceResults(
        question,
        questionAnswers,
        answerOptionsByAnswer,
      ),
      likertAverage: buildLikertAverage(questionAnswers),
      likertResults: buildLikertResults(question, questionAnswers),
      freeTextResults: buildFreeTextResults(questionAnswers, responseById),
    };
  });
}

function buildChoiceResults(
  question: SurveyQuestion,
  answers: AnswerRow[],
  answerOptionsByAnswer: Map<string, AnswerOptionRow[]>,
) {
  if (question.type !== 'multiple_choice') {
    return [];
  }

  const optionCounts = new Map<string, number>();
  let selectedOptionCount = 0;

  for (const answer of answers) {
    for (const answerOption of answerOptionsByAnswer.get(answer.id) ?? []) {
      selectedOptionCount += 1;
      optionCounts.set(
        answerOption.option_id,
        (optionCounts.get(answerOption.option_id) ?? 0) + 1,
      );
    }
  }

  return question.options.map((option) => {
    const count = optionCounts.get(option.id) ?? 0;

    return {
      optionId: option.id,
      label: option.label,
      count,
      percentage: calculatePercentage(count, selectedOptionCount),
    };
  });
}

function buildLikertAverage(answers: AnswerRow[]) {
  const values = answers
    .map((answer) => answer.likert_value)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((currentSum, value) => currentSum + value, 0);
  return Number((sum / values.length).toFixed(1));
}

function buildLikertResults(
  question: SurveyQuestion,
  answers: AnswerRow[],
): SurveyLikertResult[] {
  if (question.type !== 'likert_scale') {
    return [];
  }

  const values = answers
    .map((answer) => answer.likert_value)
    .filter((value): value is number => value !== null);

  return getQuestionScaleValues(question).map((value) => {
    const count = values.filter((answerValue) => answerValue === value).length;

    return {
      value,
      count,
      percentage: calculatePercentage(count, values.length),
    };
  });
}

function buildFreeTextResults(
  answers: AnswerRow[],
  responseById: Map<string, SurveyResponseRow>,
): SurveyFreeTextResult[] {
  return answers
    .filter((answer) => answer.free_text !== null && answer.free_text.trim() !== '')
    .map((answer) => {
      const response = responseById.get(answer.response_id);

      return {
        answerId: answer.id,
        responseId: answer.response_id,
        submittedAt: response?.submitted_at ?? '',
        respondentLabel: response ? getRespondentLabel(response) : null,
        text: answer.free_text ?? '',
      };
    })
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

function getRespondentLabel(response: SurveyResponseRow) {
  if (response.response_mode === 'anonymous') {
    return null;
  }

  return response.respondent_name ?? response.respondent_email ?? 'Identifisert svar';
}

function calculatePercentage(count: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function groupBy<TValue>(
  values: TValue[],
  getKey: (value: TValue) => string,
) {
  const groupedValues = new Map<string, TValue[]>();

  for (const value of values) {
    const key = getKey(value);
    const existingValues = groupedValues.get(key) ?? [];
    existingValues.push(value);
    groupedValues.set(key, existingValues);
  }

  return groupedValues;
}

async function getNextQuestionSortOrder(surveyId: string) {
  const client = requireSurveyClient();
  const { data, error } = await client
    .from('questions')
    .select('sort_order')
    .eq('survey_id', surveyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? data.sort_order + 1 : 0;
}

async function getNextSectionSortOrder(surveyId: string) {
  const client = requireSurveyClient();
  const { data, error } = await client
    .from('survey_sections')
    .select('sort_order')
    .eq('survey_id', surveyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? data.sort_order + 1 : 0;
}

async function insertQuestionOptions(questionId: string, labels: string[]) {
  if (labels.length === 0) {
    return [];
  }

  const client = requireSurveyClient();
  const payload: TablesInsert<'question_options'>[] = labels.map((label, index) => ({
    question_id: questionId,
    label,
    value: createOptionValue(label),
    sort_order: index,
  }));

  const { data, error } = await client
    .from('question_options')
    .insert(payload)
    .select(questionOptionSelect);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapQuestionOption);
}

function normalizeOptionalText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeQuestionScale(
  scaleMin: number | null | undefined,
  scaleMax: number | null | undefined,
) {
  const normalizedMin = scaleMin ?? questionScaleDefaults.min;
  const normalizedMax = scaleMax ?? questionScaleDefaults.max;

  if (!Number.isInteger(normalizedMin) || !Number.isInteger(normalizedMax)) {
    throw new Error('Skalaen må bruke hele tall.');
  }

  if (
    normalizedMin < questionScaleLimits.min ||
    normalizedMax > questionScaleLimits.max
  ) {
    throw new Error(
      `Skalaen må være mellom ${questionScaleLimits.min} og ${questionScaleLimits.max}.`,
    );
  }

  if (normalizedMin >= normalizedMax) {
    throw new Error('Skalaen må ha lavere minimumsverdi enn maksimumsverdi.');
  }

  return {
    scaleMin: normalizedMin,
    scaleMax: normalizedMax,
  };
}

function normalizeOptionLabels(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter((value, index, allValues) => value.length > 0 && allValues.indexOf(value) === index);
}

function createSurveySlug(title: string) {
  const slugBase = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nb-NO')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');

  const safeBase = slugBase.length >= 3 ? slugBase : 'skjema';
  return `${safeBase}-${randomSuffix()}`;
}

function createOptionValue(label: string) {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nb-NO')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
}

function randomSuffix() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

function requireSurveyClient() {
  if (!supabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return supabase;
}

function requirePublicSurveyClient() {
  if (!publicSupabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return publicSupabase;
}
