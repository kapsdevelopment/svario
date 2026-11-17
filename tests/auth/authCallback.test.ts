import { beforeEach, expect, it, vi } from 'vitest';

const initializeSession = vi.hoisted(() => vi.fn());
vi.mock('../../src/data/auth/authRepository', () => ({ initializeAuthSession: initializeSession }));

import { initializeAuthCallback } from '../../src/app/initializeAuthCallback';

const tokens = 'access_token=test-access&refresh_token=test-refresh&expires_in=3600&token_type=bearer';

beforeEach(() => {
  initializeSession.mockReset().mockResolvedValue(undefined);
  window.history.replaceState(null, '', '/');
});

it('waits for Supabase to consume the fragment before selecting the reset route', async () => {
  let finish!: () => void;
  initializeSession.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  window.history.replaceState(null, '', `/portal/?auth=recovery#${tokens}&type=recovery`);
  const pending = initializeAuthCallback();
  await vi.waitFor(() => expect(initializeSession).toHaveBeenCalledOnce());
  expect(window.location.hash).toContain('access_token');
  // Supabase clears the hash before initialization resolves.
  window.history.replaceState(null, '', '/portal/?auth=recovery');
  finish();
  await pending;
  expect(window.location.href).toBe('http://localhost:3000/portal/#/reset-password');
});

it('recognizes recovery even if a template redirects to Site URL without the marker', async () => {
  window.history.replaceState(null, '', `/#${tokens}&type=recovery`);
  await initializeAuthCallback();
  expect(window.location.hash).toBe('#/reset-password');
});

it('keeps expired-link errors out of the editable password form and browser history', async () => {
  window.history.replaceState(null, '', '/?auth=recovery#error=access_denied&error_code=otp_expired&error_description=private-message');
  await initializeAuthCallback();
  expect(initializeSession).not.toHaveBeenCalled();
  expect(window.location.href).toBe('http://localhost:3000/#/reset-password?error=invalid_link');
});

it('does not accept a bare recovery marker as a valid callback for an existing session', async () => {
  window.history.replaceState(null, '', '/?auth=recovery');
  await initializeAuthCallback();
  expect(initializeSession).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('#/reset-password?error=invalid_link');
});

it('handles rejected tokens without falling back to a previously signed-in account', async () => {
  initializeSession.mockRejectedValue(new Error('Invalid access token'));
  window.history.replaceState(null, '', `/?auth=recovery#${tokens}&type=recovery`);
  await initializeAuthCallback();
  expect(window.location.hash).toBe('#/reset-password?error=invalid_link');
  expect(window.location.href).not.toContain('test-access');
});

it('routes valid signup and magic links through login after authentication', async () => {
  window.history.replaceState(null, '', `/#${tokens}&type=signup`);
  await initializeAuthCallback();
  expect(initializeSession).toHaveBeenCalledOnce();
  expect(window.location.hash).toBe('#/login');
});

it('routes malformed and expired non-recovery links to a useful login error', async () => {
  window.history.replaceState(null, '', '/#access_token=incomplete');
  await initializeAuthCallback();
  expect(initializeSession).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('#/login?error=invalid_link');
});

it.each(['/#/login', '/#/s/survey-name', '/#/reset-password', '/#/forgot-password'])('preserves normal navigation and reloads: %s', async (url) => {
  window.history.replaceState(null, '', url);
  const before = window.location.href;
  await initializeAuthCallback();
  expect(initializeSession).not.toHaveBeenCalled();
  expect(window.location.href).toBe(before);
});
