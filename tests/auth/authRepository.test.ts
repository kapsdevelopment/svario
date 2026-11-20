import { beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  initialize: vi.fn(), getSession: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
}));
vi.mock('../../src/data/supabase/client', () => ({ supabase: { auth } }));

import { initializeAuthSession, requestPasswordReset, updatePassword } from '../../src/data/auth/authRepository';

beforeEach(() => {
  for (const mock of Object.values(auth)) mock.mockReset();
});

it('sends recovery mail using Supabase Auth with the specified return URL', async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  await requestPasswordReset('admin@example.test', 'https://svario.no/?auth=recovery');
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@example.test', { redirectTo: 'https://svario.no/?auth=recovery' });
});

it('propagates send failures rather than reporting mail as sent', async () => {
  const error = new Error('Email rate limit exceeded');
  auth.resetPasswordForEmail.mockResolvedValue({ error });
  await expect(requestPasswordReset('admin@example.test', 'https://svario.no/')).rejects.toBe(error);
});

it('rejects failed initialization even when an old session is available', async () => {
  const error = new Error('Expired token');
  auth.initialize.mockResolvedValue({ error });
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'old-user' } } }, error: null });
  await expect(initializeAuthSession()).rejects.toBe(error);
  expect(auth.getSession).not.toHaveBeenCalled();
});

it('requires a session after successful callback initialization', async () => {
  auth.initialize.mockResolvedValue({ error: null });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await expect(initializeAuthSession()).rejects.toThrow('utløpt eller ugyldig');
});

it('accepts a validated recovery session and updates its password through Auth', async () => {
  auth.initialize.mockResolvedValue({ error: null });
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'recovered-user' } } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  await initializeAuthSession();
  await updatePassword('new secure password');
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new secure password' });
});
