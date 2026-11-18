import { useQuery } from '@tanstack/react-query';

import { getRespondentBranding } from '../../data/workspaces/respondentBrandingRepository';

export const respondentBrandingQueryKey = ['respondentBranding'] as const;

export function useRespondentBranding(slug: string | undefined) {
  const normalizedSlug = slug?.trim().toLocaleLowerCase('nb-NO') ?? '';
  const { data, isError } = useQuery({
    queryKey: [...respondentBrandingQueryKey, normalizedSlug],
    queryFn: () => getRespondentBranding(normalizedSlug),
    enabled: Boolean(normalizedSlug),
    retry: false,
    staleTime: 0,
  });

  return isError ? null : data;
}
