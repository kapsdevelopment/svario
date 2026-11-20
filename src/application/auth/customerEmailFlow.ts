import { getCurrentSession, hasAuthClient, requestPasswordReset, resendConfirmation } from '../../data/auth/authRepository';
import type { captureEmailCallback } from '../../domain/instance/emailCallback';
import { getAuthRedirectUrl } from '../../infrastructure/config/authRedirect';

const recoveryKey = 'svario-recovery-user';
export async function initializeCustomerEmailFlow(callback: ReturnType<typeof captureEmailCallback>) {
  const { kind, accessToken } = callback;
  if (!kind || !hasAuthClient()) return;
  try {
    const session = await getCurrentSession(); // Lets Auth verify and consume the implicit callback first.
    if (kind === 'error' || !session || !accessToken || session.access_token !== accessToken) throw new Error('Invalid email link');
    if (kind === 'recovery') sessionStorage.setItem(recoveryKey, session.user.id);
    window.history.replaceState(null, '', `${window.location.pathname}#/${kind === 'recovery' ? 'reset-password' : 'dashboard'}`);
  } catch {
    sessionStorage.removeItem(recoveryKey);
    window.history.replaceState(null, '', `${window.location.pathname}#/login?emailLink=invalid`);
  }
}
export function canResetPassword(userId: string | undefined) {
  return !!userId && sessionStorage.getItem(recoveryKey) === userId;
}
export function finishPasswordRecovery() { sessionStorage.removeItem(recoveryKey); }
export function sendPasswordRecovery(email: string) { return requestPasswordReset(email, getAuthRedirectUrl()); }
export function sendConfirmationAgain(email: string) { return resendConfirmation(email, getAuthRedirectUrl()); }
