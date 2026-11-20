import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let client: SupabaseClient | undefined;
const user = { id: 'a04447d3-3ecf-4b0a-8af3-6fc346ef7826', email: 'recovery@example.test', aud: 'authenticated' };
const accessToken = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })),
  btoa('test-only-signature'),
].join('.');
const fragment = new URLSearchParams({
  access_token: accessToken,
  refresh_token: 'test-only-refresh-token',
  expires_in: '3600',
  token_type: 'bearer',
  type: 'recovery',
});

beforeEach(() => {
  vi.resetModules();
  window.history.replaceState(null, '', '/');
});
afterEach(async () => {
  await client?.auth.stopAutoRefresh();
  vi.doUnmock('../../src/data/supabase/client');
});

function installAuthClient(fetch: typeof globalThis.fetch) {
  vi.doMock('../../src/data/supabase/client', () => {
    client = createClient('https://auth.example.test', 'test-only-publishable-key', {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch },
    });
    return { supabase: client };
  });
}

it('consumes a real SDK recovery callback before routing and updates the recovered account', async () => {
  const requests: { path: string; method: string; body: unknown }[] = [];
  installAuthClient(async (input, init) => {
    const path = new URL(String(input)).pathname;
    const method = init?.method ?? 'GET';
    requests.push({ path, method, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (path === '/auth/v1/user') return Response.json(user);
    throw new Error(`Unexpected Auth request: ${method} ${path}`);
  });
  window.history.replaceState(null, '', `/?auth=recovery#${fragment}`);

  const { initializeAuthCallback } = await import('../../src/app/initializeAuthCallback');
  await initializeAuthCallback();
  expect(window.location.href).toBe('http://localhost:3000/#/reset-password');
  const { getCurrentSession, updatePassword } = await import('../../src/data/auth/authRepository');
  expect((await getCurrentSession())?.user.id).toBe(user.id);
  await updatePassword('new-password-for-test');
  expect(requests.find((request) => request.method === 'PUT')).toMatchObject({
    path: '/auth/v1/user',
    body: { password: 'new-password-for-test' },
  });
});

it('turns an SDK token rejection into the expired-link route and removes all tokens', async () => {
  installAuthClient(async () => Response.json({ message: 'invalid JWT', code: 'bad_jwt' }, { status: 401 }));
  window.history.replaceState(null, '', `/?auth=recovery#${fragment}`);
  const { initializeAuthCallback } = await import('../../src/app/initializeAuthCallback');
  await initializeAuthCallback();
  expect(window.location.href).toBe('http://localhost:3000/#/reset-password?error=invalid_link');
});

it('uses the customer recovery marker for the recovered user only and clears it after reset', async () => {
  installAuthClient(async () => Response.json(user));
  window.history.replaceState(null, '', `/#${fragment}`);
  const { captureEmailCallback } = await import('../../src/domain/instance/emailCallback');
  const callback = captureEmailCallback(window.location.hash);
  const { initializeCustomerEmailFlow, canResetPassword, finishPasswordRecovery } =
    await import('../../src/application/auth/customerEmailFlow');
  await initializeCustomerEmailFlow(callback);
  expect(window.location.hash).toBe('#/reset-password');
  expect(canResetPassword(user.id)).toBe(true);
  expect(canResetPassword('another-user')).toBe(false);
  finishPasswordRecovery();
  expect(canResetPassword(user.id)).toBe(false);
});

it('uses the SDK recover endpoint with a hash-free, allow-listable return URL', async () => {
  let requestUrl = '';
  let requestBody: unknown;
  installAuthClient(async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return Response.json({});
  });
  const { requestPasswordReset } = await import('../../src/data/auth/authRepository');
  await requestPasswordReset(user.email, 'https://svario.no/?auth=recovery');
  expect(new URL(requestUrl).pathname).toBe('/auth/v1/recover');
  expect(new URL(requestUrl).searchParams.get('redirect_to')).toBe('https://svario.no/?auth=recovery');
  expect(requestBody).toMatchObject({ email: user.email });
});
