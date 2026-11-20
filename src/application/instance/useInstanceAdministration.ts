import { useQuery } from '@tanstack/react-query';
import { readInstanceAdmin, readRegistrationPolicy, listInstanceUsers } from '../../data/instance/instanceRepository';
import { isCustomerBuild } from '../../infrastructure/config/instanceBrand';
import { useAuth } from '../auth/AuthProvider';
export { updateRegistrationPolicy } from '../../data/instance/instanceRepository';

export function useRegistrationPolicy() {
  return useQuery({ queryKey: ['instance-registration-policy'], queryFn: readRegistrationPolicy,
    enabled: isCustomerBuild, retry: false, staleTime: 0 });
}
export function useInstanceAdmin() {
  const auth = useAuth();
  const query = useQuery({ queryKey: ['instance-admin', auth.user?.id], queryFn: readInstanceAdmin,
    enabled: isCustomerBuild && auth.isAdminReady, retry: false, staleTime: 0 });
  return { ...query, isInstanceAdmin: isCustomerBuild && auth.isAdminReady && query.data === true };
}
export function useInstanceUsers(offset: number, enabled: boolean) {
  const auth = useAuth();
  return useQuery({ queryKey: ['instance-users', auth.user?.id, offset], queryFn: () => listInstanceUsers(offset),
    enabled, retry: false, staleTime: 0 });
}
