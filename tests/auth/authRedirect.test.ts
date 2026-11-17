import { beforeEach, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ authRedirectUrl: null as string | null }));
vi.mock('../../src/infrastructure/config/env', () => ({ appEnv: env }));

import { getAuthRedirectUrl, getPasswordResetRedirectUrl } from '../../src/infrastructure/config/authRedirect';

beforeEach(() => { env.authRedirectUrl = null; });

it('uses the current origin for local recovery', () => {
  expect(getPasswordResetRedirectUrl()).toBe('http://localhost:3000/?auth=recovery');
});

it.each([
  ['https://svario.no', 'https://svario.no/?auth=recovery'],
  ['svario.no/#/login', 'https://svario.no/?auth=recovery'],
  ['https://example.test/svario/?old=1#/login', 'https://example.test/svario/?auth=recovery'],
  ['/portal/', 'http://localhost:3000/portal/?auth=recovery'],
])('keeps recovery on the deployed index page for %s', (configured, expected) => {
  env.authRedirectUrl = configured;
  expect(getPasswordResetRedirectUrl()).toBe(expected);
  expect(new URL(getPasswordResetRedirectUrl()).hash).toBe('');
});

it('does not mark signup and magic-link callbacks as password recovery', () => {
  env.authRedirectUrl = 'https://svario.no/?auth=recovery#/reset-password';
  expect(getAuthRedirectUrl()).toBe('https://svario.no/');
});
