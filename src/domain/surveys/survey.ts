export type SurveyStatus = 'draft' | 'published' | 'closed';

export type SurveyResponseMode = 'anonymous' | 'identified';

export type QuestionType = 'multiple_choice' | 'free_text' | 'likert_1_5';

export type SurveySummary = {
  id: string;
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
  title: string;
  description: string | null;
  responseMode: SurveyResponseMode;
  startsAt: string | null;
  endsAt: string | null;
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
  sortOrder: number;
  options: SurveyQuestionOption[];
};

export type SurveyEditor = SurveySummary & {
  sections: SurveySection[];
  questions: SurveyQuestion[];
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
  optionLabels: string[];
};
