import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyProfile,
  updateMyProfile,
} from '../../data/profiles/profileRepository';
import type { UpdateProfileInput } from '../../domain/profiles/profile';

export const myProfileQueryKey = ['my-profile'] as const;

export function useMyProfile(accountId: string | null | undefined) {
  return useQuery({
    enabled: Boolean(accountId),
    queryKey: [...myProfileQueryKey, accountId],
    queryFn: () => getMyProfile(accountId!),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData([...myProfileQueryKey, profile.id], profile);
      void queryClient.invalidateQueries({
        queryKey: [...myProfileQueryKey, profile.id],
      });
    },
  });
}
