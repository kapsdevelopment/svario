import type { BusinessRegistryOrganization } from '../../domain/workspaces/workspace';
import { supabase } from '../supabase/client';

export async function lookupOrganizationByNumber(
  organizationNumber: string,
): Promise<BusinessRegistryOrganization> {
  const normalizedOrganizationNumber = organizationNumber.replace(/\D/g, '');

  if (!/^[0-9]{9}$/.test(normalizedOrganizationNumber)) {
    throw new Error('Organisasjonsnummeret må være 9 siffer.');
  }

  const client = requireBrregClient();
  const { data, error } =
    await client.functions.invoke<BusinessRegistryOrganization>(
      'lookup-organization',
      {
        body: { organizationNumber: normalizedOrganizationNumber },
        method: 'POST',
      },
    );

  if (error) {
    throw new Error(
      (await getFunctionErrorMessage(error)) ??
        'Kunne ikke hente bedriften fra BRREG.',
    );
  }

  if (!data) {
    throw new Error('BRREG returnerte ikke en gyldig bedrift.');
  }

  return data;
}

async function getFunctionErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object' || !('context' in error)) {
    return null;
  }

  const context = error.context;

  if (!(context instanceof Response)) {
    return null;
  }

  try {
    const body = (await context.clone().json()) as { message?: unknown };
    return typeof body.message === 'string' ? body.message : null;
  } catch {
    return null;
  }
}

function requireBrregClient() {
  if (!supabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return supabase;
}
