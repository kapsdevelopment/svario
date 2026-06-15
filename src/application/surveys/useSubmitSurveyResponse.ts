import { useMutation } from '@tanstack/react-query';

import { submitSurveyResponse } from '../../data/surveys/surveyRepository';
import type { SubmitSurveyResponseInput } from '../../domain/surveys/survey';

export function useSubmitSurveyResponse() {
  return useMutation({
    mutationFn: (input: SubmitSurveyResponseInput) =>
      submitSurveyResponse(input),
  });
}
