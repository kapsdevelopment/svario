import { useQuery } from '@tanstack/react-query';

import { getPublishedSurveyBySlug } from '../../data/surveys/surveyRepository';

export const publishedSurveyQueryKey = (slug: string) =>
  ['surveys', 'published', slug] as const;

export function usePublishedSurvey(slug: string | undefined) {
  return useQuery({
    queryKey: publishedSurveyQueryKey(slug ?? ''),
    queryFn: () => {
      if (!slug) {
        throw new Error('Mangler skjema-lenke.');
      }

      return getPublishedSurveyBySlug(slug);
    },
    enabled: Boolean(slug),
    retry: false,
  });
}
