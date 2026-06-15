import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createSurveyDraft,
} from '../../data/surveys/surveyRepository';
import { surveyListQueryKey } from './useSurveyList';

export function useCreateSurveyDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSurveyDraft,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: surveyListQueryKey }),
  });
}
