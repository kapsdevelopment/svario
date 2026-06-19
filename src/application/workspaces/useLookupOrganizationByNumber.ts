import { useMutation } from '@tanstack/react-query';

import { lookupOrganizationByNumber } from '../../data/brreg/brregRepository';

export function useLookupOrganizationByNumber() {
  return useMutation({
    mutationFn: lookupOrganizationByNumber,
  });
}
