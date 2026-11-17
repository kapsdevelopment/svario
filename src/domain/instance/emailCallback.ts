// Supabase's implicit email callback uses the fragment, as does our HashRouter.
// Read this before creating the router; never render or log callback tokens.
export function emailCallbackKind(hash: string): 'recovery' | 'confirmation' | 'error' | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.has('error') || params.has('error_code')) return 'error';
  if (!params.has('access_token') || !params.has('refresh_token')) return null;
  return params.get('type') === 'recovery' ? 'recovery' : 'confirmation';
}
