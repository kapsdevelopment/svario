export function readAuthCallback(href: string) {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const isRecovery = url.searchParams.get('auth') === 'recovery' || fragment.get('type') === 'recovery';
  const hasError = ['error', 'error_code', 'error_description'].some(
    (key) => fragment.has(key) || url.searchParams.has(key),
  );
  const hasAuthTokens = fragment.has('access_token') || fragment.has('refresh_token');

  if (!isRecovery && !hasError && !hasAuthTokens) {
    return null;
  }

  return {
    isRecovery,
    // A bare recovery marker must not reuse an unrelated, already signed-in session.
    canInitialize: !hasError && Boolean(fragment.get('access_token') && fragment.get('refresh_token')),
  };
}

export function getAuthCallbackReturnUrl(href: string, route: string, failed: boolean) {
  const url = new URL(href);
  // Neither tokens nor provider error descriptions should remain in browser history.
  url.search = '';
  url.hash = `${route}${failed ? '?error=invalid_link' : ''}`;
  return url.toString();
}
