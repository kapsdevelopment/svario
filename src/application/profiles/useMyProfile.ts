import { useQuery } from '@tanstack/react-query';

import { getMyProfile } from '../../data/profiles/profileRepository';

export const myProfileQueryKey = ['my-profile'] as const;

export function useMyProfile(accountId: string | null | undefined) {
  return useQuery({
    enabled: Boolean(accountId),
    queryKey: [...myProfileQueryKey, accountId],
    queryFn: () => getMyProfile(accountId!),
  });
}
