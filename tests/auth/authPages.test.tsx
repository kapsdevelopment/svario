import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AuthApiError } from '@supabase/supabase-js';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  status: 'unauthenticated', bootstrapStatus: 'idle', isAdminReady: false,
  user: null as null | { id: string }, errorMessage: null,
  signInWithPassword: vi.fn(), signInWithMagicLink: vi.fn(), signUpWithPassword: vi.fn(),
  requestPasswordReset: vi.fn(), updatePassword: vi.fn(),
}));
const brand = vi.hoisted(() => ({ name: 'Svario', logoUrl: null, presentationOnly: false }));
vi.mock('../../src/application/auth/AuthProvider', () => ({ useAuth: () => auth }));
vi.mock('../../src/infrastructure/config/env', () => ({ appEnv: { authRedirectUrl: 'https://svario.no/' } }));
vi.mock('../../src/infrastructure/config/instanceBrand', () => ({ instanceBrand: brand, isCustomerBuild: false }));

import { LoginPage } from '../../src/presentation/admin/auth/LoginPage';
import { RegisterPage } from '../../src/presentation/admin/auth/RegisterPage';
import { ForgotPasswordPage } from '../../src/presentation/admin/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../src/presentation/admin/auth/ResetPasswordPage';

function openPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.status = 'unauthenticated';
  auth.bootstrapStatus = 'idle';
  auth.isAdminReady = false;
  auth.user = null;
  brand.presentationOnly = false;
  for (const value of Object.values(auth)) {
    if (vi.isMockFunction(value)) value.mockReset().mockResolvedValue(undefined);
  }
});
afterEach(cleanup);

it('keeps one password field for login and opens a separate registration form', async () => {
  const user = userEvent.setup();
  openPage('/login');
  expect(screen.getAllByLabelText('Passord')).toHaveLength(1);
  expect(screen.queryByLabelText('Gjenta passord')).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Opprett konto' }));
  expect(screen.getByLabelText('Gjenta passord')).toBeTruthy();
  expect(auth.signUpWithPassword).not.toHaveBeenCalled();
});

it('blocks mismatched signup passwords and only sends the matching password to Supabase', async () => {
  const user = userEvent.setup();
  openPage('/register');
  await user.type(screen.getByLabelText('E-post'), 'admin@example.test');
  await user.type(screen.getByLabelText('Passord'), 'SecurePassword1');
  await user.type(screen.getByLabelText('Gjenta passord'), 'SecurePassword2');
  await user.click(screen.getByRole('button', { name: 'Opprett konto' }));
  expect(screen.getByRole('alert').textContent).toContain('ikke like');
  expect(auth.signUpWithPassword).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Gjenta passord'));
  await user.type(screen.getByLabelText('Gjenta passord'), 'SecurePassword1');
  await user.click(screen.getByRole('button', { name: 'Opprett konto' }));
  expect(auth.signUpWithPassword).toHaveBeenCalledExactlyOnceWith('admin@example.test', 'SecurePassword1', 'https://svario.no/');
  expect(screen.getByRole('status').textContent).toContain('Sjekk e-posten din');
  expect(screen.queryByLabelText('Passord')).toBeNull();
});

it('validates password length even if native browser validation is bypassed', () => {
  openPage('/register');
  fireEvent.change(screen.getByLabelText('Passord'), { target: { value: 'short' } });
  fireEvent.change(screen.getByLabelText('Gjenta passord'), { target: { value: 'short' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Opprett konto' }).closest('form')!);
  expect(screen.getByRole('alert').textContent).toContain('minst 6 tegn');
  expect(auth.signUpWithPassword).not.toHaveBeenCalled();
});

it('opens forgot password from login and sends a neutral confirmation', async () => {
  const user = userEvent.setup();
  openPage('/login');
  await user.click(screen.getByRole('link', { name: 'Glemt passord?' }));
  expect(screen.queryByLabelText('Passord')).toBeNull();
  await user.type(screen.getByLabelText('E-post'), 'unknown@example.test');
  await user.click(screen.getByRole('button', { name: 'Send tilbakestillingslenke' }));
  expect(auth.requestPasswordReset).toHaveBeenCalledExactlyOnceWith('unknown@example.test', 'https://svario.no/?auth=recovery');
  expect(screen.getByRole('status').textContent).toContain('Hvis e-postadressen er registrert');
});

it('shows send failures and allows the request to be retried', async () => {
  const user = userEvent.setup();
  auth.requestPasswordReset.mockRejectedValueOnce(new Error('Email rate limit exceeded'));
  openPage('/forgot-password');
  await user.type(screen.getByLabelText('E-post'), 'admin@example.test');
  await user.click(screen.getByRole('button', { name: 'Send tilbakestillingslenke' }));
  expect(screen.getByRole('alert').textContent).toContain('for mange forsøk');
  expect(screen.queryByRole('status')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Send tilbakestillingslenke' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('status')).toBeTruthy();
});

it('disables repeated recovery requests while a send is pending', async () => {
  const user = userEvent.setup();
  let finish!: () => void;
  auth.requestPasswordReset.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  openPage('/forgot-password');
  await user.type(screen.getByLabelText('E-post'), 'admin@example.test');
  await user.click(screen.getByRole('button', { name: 'Send tilbakestillingslenke' }));
  expect((screen.getByRole('button', { name: 'Sender...' }) as HTMLButtonElement).disabled).toBe(true);
  expect(auth.requestPasswordReset).toHaveBeenCalledOnce();
  finish();
  await screen.findByRole('status');
});

it.each([
  ['unauthenticated', null, '/reset-password'],
  ['authenticated', { id: 'old-user' }, '/reset-password?error=invalid_link'],
])('does not allow reset with an invalid link or missing session (%s)', async (status, currentUser, path) => {
  const user = userEvent.setup();
  auth.status = status;
  auth.user = currentUser;
  openPage(path);
  expect(screen.getByRole('alert').textContent).toContain('utløpt eller ugyldig');
  expect(screen.queryByLabelText('Nytt passord')).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Be om ny lenke' }));
  expect(screen.getByRole('heading', { name: 'Glemt passord' })).toBeTruthy();
  expect(auth.updatePassword).not.toHaveBeenCalled();
});

it('waits for session initialization before deciding that a reset link is invalid', () => {
  auth.status = 'loading';
  openPage('/reset-password');
  expect(screen.getByRole('status').textContent).toBe('Kontrollerer lenken...');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('checks both reset passwords and saves only after they match', async () => {
  const user = userEvent.setup();
  auth.status = 'authenticated';
  auth.user = { id: 'recovered-user' };
  // Recovery should work even if account bootstrap is still loading or has failed.
  auth.bootstrapStatus = 'error';
  openPage('/reset-password');
  await user.type(screen.getByLabelText('Nytt passord'), 'NewPassword1');
  await user.type(screen.getByLabelText('Gjenta nytt passord'), 'NewPassword2');
  await user.click(screen.getByRole('button', { name: 'Lagre nytt passord' }));
  expect(auth.updatePassword).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toContain('ikke like');
  await user.clear(screen.getByLabelText('Gjenta nytt passord'));
  await user.type(screen.getByLabelText('Gjenta nytt passord'), 'NewPassword1');
  await user.click(screen.getByRole('button', { name: 'Lagre nytt passord' }));
  expect(auth.updatePassword).toHaveBeenCalledExactlyOnceWith('NewPassword1');
  expect(screen.getByRole('status').textContent).toContain('Passordet er oppdatert');
  expect(screen.queryByLabelText('Nytt passord')).toBeNull();
});

it('lets the user continue with an unchanged password without claiming it was updated', async () => {
  const user = userEvent.setup();
  auth.status = 'authenticated';
  auth.user = { id: 'recovered-user' };
  auth.updatePassword.mockRejectedValue(new AuthApiError('New password should be different from the old password.', 422, 'same_password'));
  openPage('/reset-password');
  await user.type(screen.getByLabelText('Nytt passord'), 'Password1');
  await user.type(screen.getByLabelText('Gjenta nytt passord'), 'Password1');
  await user.click(screen.getByRole('button', { name: 'Lagre nytt passord' }));
  expect(auth.updatePassword).toHaveBeenCalledExactlyOnceWith('Password1');
  expect(screen.getByRole('status').textContent).toBe('Dette er allerede passordet ditt. Du kan fortsette å bruke det.');
  expect(screen.getByRole('status').textContent).not.toContain('oppdatert');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByLabelText('Nytt passord')).toBeNull();
  expect(screen.queryByLabelText('Gjenta nytt passord')).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Gå til Svario' }));
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
});

it.each([
  new AuthApiError('Password is too short.', 422, 'weak_password'),
  new AuthApiError('New password should be different from the old password.', 500, 'unexpected_failure'),
  new Error('New password should be different from the old password.'),
])('keeps other errors actionable rather than treating them as an unchanged password (%s)', async (error) => {
  const user = userEvent.setup();
  auth.status = 'authenticated';
  auth.user = { id: 'recovered-user' };
  auth.updatePassword.mockRejectedValue(error);
  openPage('/reset-password');
  await user.type(screen.getByLabelText('Nytt passord'), 'Password1');
  await user.type(screen.getByLabelText('Gjenta nytt passord'), 'Password1');
  await user.click(screen.getByRole('button', { name: 'Lagre nytt passord' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Gå til Svario' })).toBeNull();
  expect(screen.getByLabelText('Nytt passord')).toBeTruthy();
});

it('keeps presentation-only customer builds free of auth forms', () => {
  brand.presentationOnly = true;
  openPage('/forgot-password');
  expect(screen.queryByLabelText('E-post')).toBeNull();
  expect(screen.getByText(/Privat Svario-prototype/)).toBeTruthy();
});
