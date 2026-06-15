import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { supabase } from '../supabase/client';
import type { Enums, Json } from '../supabase/database.types';

export type DomainAccount = {
  id: string;
  status: Enums<'account_status'>;
};

type AuthStateSubscriber = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

export function hasAuthClient() {
  return supabase !== null;
}

export async function getCurrentSession() {
  const client = requireAuthClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToAuthChanges(subscriber: AuthStateSubscriber) {
  const client = requireAuthClient();
  const { data } = client.auth.onAuthStateChange((event, session) => {
    subscriber(event, session);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireAuthClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  redirectTo: string,
) {
  const client = requireAuthClient();
  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithMagicLink(email: string, redirectTo: string) {
  const client = requireAuthClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const client = requireAuthClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string) {
  const client = requireAuthClient();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function bootstrapDomainAccount(user: User): Promise<DomainAccount> {
  const client = requireAuthClient();
  const { data: accountId, error: ensureError } = await client.rpc(
    'ensure_account_initialized_v2',
  );

  if (ensureError) {
    throw ensureError;
  }

  if (!accountId) {
    throw new Error('Kunne ikke opprette domenekonto.');
  }

  const providerIdentity = getPrimaryIdentity(user);
  const { error: syncError } = await client.rpc('sync_my_identity', {
    p_provider: providerIdentity.provider,
    p_subject: providerIdentity.subject,
    p_email: user.email ?? undefined,
    p_provider_display_name: getProviderDisplayName(user) ?? undefined,
    p_email_is_private: false,
    p_raw_user_meta: toJson(user.user_metadata),
    p_raw_app_meta: toJson(user.app_metadata),
  });

  if (syncError) {
    throw syncError;
  }

  const { data: account, error: accountError } = await client
    .from('accounts')
    .select('id, status')
    .eq('id', accountId)
    .single();

  if (accountError) {
    throw accountError;
  }

  return {
    id: account.id,
    status: account.status,
  };
}

function requireAuthClient() {
  if (!supabase) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  return supabase;
}

function getPrimaryIdentity(user: User) {
  const identity = user.identities?.[0];
  const provider = identity?.provider ?? getString(user.app_metadata.provider) ?? 'email';
  const subject = identity?.id ?? user.id;

  return { provider, subject };
}

function getProviderDisplayName(user: User) {
  return (
    getString(user.user_metadata.full_name) ??
    getString(user.user_metadata.name) ??
    user.email ??
    null
  );
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function toJson(value: unknown): Json {
  if (value === undefined) {
    return null;
  }

  return value as Json;
}
