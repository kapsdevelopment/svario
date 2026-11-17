import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeEmailDomains, emailMatchesPolicy } from '../src/domain/instance/registrationPolicy.ts';
import { emailCallbackKind, captureEmailCallback } from '../src/domain/instance/emailCallback.ts';

test('email domains are exact, canonical and deduplicated', () => {
  assert.deepEqual(normalizeEmailDomains('Example.TEST, other.test\nEXAMPLE.test'), ['example.test', 'other.test']);
  for (const value of ['', '*.example.test', '@example.test', 'foo@bar.test', '-bad.test', 'bad..test', 'https://example.test', 'æ.test']) {
    assert.throws(() => normalizeEmailDomains(value));
  }
  assert.throws(() => normalizeEmailDomains(Array.from({length: 51}, (_, i) => `d${i}.test`).join('\n')));
});
test('closed/disabled deny, and domain rules do not allow suffix or subdomain bypass', () => {
  const p = { enabled: true, mode: 'domains', allowedDomains: ['example.test'], version: 1 };
  assert.equal(emailMatchesPolicy('User@EXAMPLE.TEST', p), true);
  for (const email of ['user@evil-example.test', 'user@sub.example.test', 'user@example.test.evil', 'a@b@example.test', '@example.test']) {
    assert.equal(emailMatchesPolicy(email, p), false);
  }
  assert.equal(emailMatchesPolicy('user@example.test', {...p, enabled: false}), false);
  assert.equal(emailMatchesPolicy('user@example.test', {...p, mode: 'closed'}), false);
  assert.equal(emailMatchesPolicy('user@elsewhere.test', {...p, mode: 'open'}), true);
});
test('email callback is detected before hash routing without treating route fragments as tokens', () => {
  assert.equal(emailCallbackKind('#/surveys?type=recovery'), null);
  assert.equal(emailCallbackKind('#access_token=x&type=recovery'), null);
  assert.equal(emailCallbackKind('#access_token=x&refresh_token=y&type=recovery'), 'recovery');
  assert.equal(emailCallbackKind('#access_token=x&refresh_token=y&type=signup'), 'confirmation');
  assert.equal(emailCallbackKind('#error=access_denied&error_code=otp_expired'), 'error');
});
test('callback identity survives Auth clearing the fragment and cannot reuse an unrelated session', () => {
  const saved = captureEmailCallback('#access_token=incoming&refresh_token=refresh&type=recovery');
  const cleared = captureEmailCallback('');
  assert.equal(saved.kind, 'recovery');
  assert.equal(saved.accessToken, 'incoming');
  assert.equal(cleared.kind, null);
  assert.notEqual(saved.accessToken, 'previous-session');
});
