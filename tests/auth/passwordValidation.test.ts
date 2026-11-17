import { describe, expect, it } from 'vitest';

import { validateNewPassword } from '../../src/domain/auth/passwordValidation';

describe('new passwords', () => {
  it('rejects empty and short passwords even when the confirmation matches', () => {
    for (const password of ['', 'a', '12345']) {
      expect(validateNewPassword(password, password)).toContain('minst 6 tegn');
    }
  });

  it('requires an exact match, including case and whitespace', () => {
    for (const confirmation of ['', 'password', 'Password ', ' Password']) {
      expect(validateNewPassword('Password', confirmation)).toContain('ikke like');
    }
  });

  it('accepts matching passwords without silently trimming them', () => {
    expect(validateNewPassword('123456', '123456')).toBeNull();
    expect(validateNewPassword(' åÆ secure pass ', ' åÆ secure pass ')).toBeNull();
  });
});
