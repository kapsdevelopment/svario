import { getAuthCallbackReturnUrl, readAuthCallback } from '../infrastructure/config/authCallback';
import { routes } from './routes';

export async function initializeAuthCallback() {
  const href = window.location.href;
  const callback = readAuthCallback(href);
  if (!callback) return;

  let failed = !callback.canInitialize;
  if (callback.canInitialize) {
    try {
      // Import only after capturing the callback. Supabase consumes the hash during initialization.
      const { initializeAuthSession } = await import('../data/auth/authRepository');
      await initializeAuthSession();
    } catch {
      failed = true;
    }
  }

  window.history.replaceState(
    window.history.state,
    '',
    getAuthCallbackReturnUrl(href, callback.isRecovery ? routes.resetPassword : routes.login, failed),
  );
}
