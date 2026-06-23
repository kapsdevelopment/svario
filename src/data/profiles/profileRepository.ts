import type { Profile, UpdateProfileInput } from '../../domain/profiles/profile';
import { supabase } from '../supabase/client';
import type { Tables, TablesUpdate } from '../supabase/database.types';

type ProfileRow = Pick<
  Tables<'profiles'>,
  'contact_email' | 'id' | 'personal_name'
>;

const profileSelect = 'id, personal_name, contact_email';

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

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<Profile> {
  const client = requireProfileClient();
  const personalName = normalizeOptionalText(input.personalName);

  if (personalName && personalName.length > 120) {
    throw new Error('Navnet kan maks være 120 tegn.');
  }

  const payload: TablesUpdate<'profiles'> = {
    personal_name: personalName,
  };

  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', input.accountId)
    .select(profileSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    personalName: row.personal_name,
    contactEmail: row.contact_email,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function requireProfileClient() {
  if (!supabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return supabase;
}
