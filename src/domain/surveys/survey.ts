export type SurveyStatus = 'draft' | 'published' | 'closed';

export type SurveyResponseMode = 'anonymous' | 'identified';

export type SurveyVisibility = 'private' | 'workspace';

export type SurveyLegalBasis =
  | 'consent'
  | 'legitimate_interests'
  | 'contract'
  | 'legal_obligation'
  | 'public_task'
  | 'other';

export type SurveyRetentionAction = 'delete_response' | 'anonymize_response';

export type QuestionType = 'multiple_choice' | 'free_text' | 'likert_scale';

export type QuestionScaleVariant = 'buttons' | 'stars' | 'nps';

export type QuestionVisualizationType = 'bar' | 'pie' | 'word_cloud' | 'list';

export type QuestionVisualizationColorMode = 'muted' | 'colorful';

export const questionScaleDefaults = {
  min: 1,
  max: 5,
} as const;

export const questionScaleLimits = {
  min: 0,
  max: 10,
} as const;

export type SurveySummary = {
  id: string;
  ownerAccountId: string | null;
  workspaceId: string | null;
  visibility: SurveyVisibility;
  repeatedFromSurveyId: string | null;
  title: string;
  description: string | null;
  slug: string;
  status: SurveyStatus;
  responseMode: SurveyResponseMode;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSurveyDraftInput = {
  ownerAccountId: string;
  workspaceId: string | null;
  visibility: SurveyVisibility;
  title: string;
  description: string | null;
  responseMode: SurveyResponseMode;
  startsAt: string | null;
  endsAt: string | null;
};

export type SurveyPrivacySettings = {
  surveyId: string;
  enabled: boolean;
  personalDataExpected: boolean;
  controllerName: string | null;
  controllerContact: string | null;
  purpose: string | null;
  legalBasis: SurveyLegalBasis | null;
  legalBasisNote: string | null;
  consentText: string | null;
  retentionDays: number | null;
  retentionAction: SurveyRetentionAction;
  respondentNotice: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertSurveyPrivacySettingsInput = {
  surveyId: string;
  enabled: boolean;
  personalDataExpected: boolean;
  controllerName: string | null;
  controllerContact: string | null;
  purpose: string | null;
  legalBasis: SurveyLegalBasis | null;
  legalBasisNote: string | null;
  consentText: string | null;
  retentionDays: number | null;
  retentionAction: SurveyRetentionAction;
  respondentNotice: string | null;
};

export type SurveySection = {
  id: string;
  surveyId: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
};

export type SurveyQuestionOption = {
  id: string;
  questionId: string;
  label: string;
  value: string | null;
  sortOrder: number;
};

export type SurveyQuestion = {
  id: string;
  surveyId: string;
  sectionId: string | null;
  type: QuestionType;
  prompt: string;
  description: string | null;
  isRequired: boolean;
  allowMultiple: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleVariant: QuestionScaleVariant | null;
  sortOrder: number;
  visualizationType: QuestionVisualizationType;
  visualizationColorMode: QuestionVisualizationColorMode;
  options: SurveyQuestionOption[];
};

export type SurveyEditor = SurveySummary & {
  sections: SurveySection[];
  questions: SurveyQuestion[];
  privacySettings: SurveyPrivacySettings | null;
  responseCount: number;
};

export type PublishedSurvey = Omit<SurveySummary, 'createdAt' | 'updatedAt'> & {
  sections: SurveySection[];
  questions: SurveyQuestion[];
  privacySettings: SurveyPrivacySettings | null;
};

export type AddSurveySectionInput = {
  surveyId: string;
  title: string;
  description: string | null;
};

export type AddSurveyQuestionInput = {
  surveyId: string;
  sectionId: string | null;
  type: QuestionType;
  prompt: string;
  description: string | null;
  isRequired: boolean;
  allowMultiple: boolean;
  scaleMin?: number | null;
  scaleMax?: number | null;
  scaleVariant?: QuestionScaleVariant | null;
  optionLabels: string[];
};

export type UpdateQuestionVisualizationInput = {
  questionId: string;
  visualizationType: QuestionVisualizationType;
  visualizationColorMode: QuestionVisualizationColorMode;
};

export type SubmitSurveyAnswerInput = {
  questionId: string;
  freeText?: string | null;
  likertValue?: number | null;
  optionIds?: string[];
};

export type SubmitSurveyResponseInput = {
  surveySlug: string;
  answers: SubmitSurveyAnswerInput[];
  respondentName: string | null;
  respondentEmail: string | null;
  privacyConsentGiven?: boolean;
  metadata?: Record<string, string>;
};

export type SurveyChoiceResult = {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
};

export type SurveyLikertResult = {
  value: number;
  count: number;
  percentage: number;
};

export type SurveyFreeTextResult = {
  answerId: string;
  responseId: string;
  submittedAt: string;
  respondentLabel: string | null;
  text: string;
};

export type SurveyResponseAnswerResult = {
  questionId: string;
  freeText: string | null;
  likertValue: number | null;
  optionIds: string[];
};

export type SurveyResponseResult = {
  id: string;
  submittedAt: string;
  respondentName: string | null;
  respondentEmail: string | null;
  answers: SurveyResponseAnswerResult[];
};

export type SurveyQuestionResult = {
  question: SurveyQuestion;
  answeredCount: number;
  skippedCount: number;
  choiceResults: SurveyChoiceResult[];
  likertAverage: number | null;
  likertResults: SurveyLikertResult[];
  freeTextResults: SurveyFreeTextResult[];
};

export type SurveyResults = SurveySummary & {
  sections: SurveySection[];
  responseCount: number;
  lastSubmittedAt: string | null;
  responses: SurveyResponseResult[];
  questionResults: SurveyQuestionResult[];
};

export function getQuestionScaleValues(
  question: Pick<SurveyQuestion, 'scaleMax' | 'scaleMin'>,
) {
  return createScaleValues(
    question.scaleMin ?? questionScaleDefaults.min,
    question.scaleMax ?? questionScaleDefaults.max,
  );
}

export function createScaleValues(scaleMin: number, scaleMax: number) {
  return Array.from(
    { length: Math.max(0, scaleMax - scaleMin + 1) },
    (_, index) => scaleMin + index,
  );
}
