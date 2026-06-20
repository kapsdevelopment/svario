import type { Profile } from '../../domain/profiles/profile';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/database.types';

type ProfileRow = Pick<
  Tables<'profiles'>,
  'contact_email' | 'display_name' | 'id'
>;

const profileSelect = 'id, display_name, contact_email';

export async function getMyProfile(accountId: string): Promise<Profile> {
  const client = requireProfileClient();
  const { data, error } = await client
    .from('profiles')
    .select(profileSelect)
    .eq('id', accountId)
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    contactEmail: row.contact_email,
  };
}

function requireProfileClient() {
  if (!supabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return supabase;
}
