import { supabase, publicSupabase } from '../supabase/client';
import type { InstanceUsersPage, RegistrationMode, RegistrationPolicy } from '../../domain/instance/registrationPolicy';

export async function readRegistrationPolicy(): Promise<RegistrationPolicy> {
  if (!publicSupabase) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await publicSupabase.rpc('instance_signup_policy');
  if (error) throw error;
  return data as unknown as RegistrationPolicy;
}
export async function readInstanceAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('instance_is_admin');
  if (error) throw error;
  return data === true;
}
export async function listInstanceUsers(offset: number): Promise<InstanceUsersPage> {
  if (!supabase) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase.rpc('instance_list_users', { p_offset: offset, p_limit: 50 });
  if (error) throw error;
  return data as unknown as InstanceUsersPage;
}
export async function updateRegistrationPolicy(mode: RegistrationMode, domains: string[], version: number) {
  if (!supabase) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase.rpc('instance_update_signup_policy', {
    p_mode: mode, p_domains: domains, p_expected_version: version,
  });
  if (error) throw error;
  return data as unknown as RegistrationPolicy;
}
