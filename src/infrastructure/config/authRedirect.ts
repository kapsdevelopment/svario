import { appEnv } from './env';

export function getAuthRedirectUrl() {
  return normalizeAuthRedirectUrl(
    appEnv.authRedirectUrl ?? window.location.origin,
  );
}

function normalizeAuthRedirectUrl(value: string) {
  const parsedUrl = parseAuthRedirectUrl(value);
  parsedUrl.search = '';
  parsedUrl.hash = '';

  if (!parsedUrl.pathname.endsWith('/')) {
    parsedUrl.pathname = `${parsedUrl.pathname}/`;
  }

  return parsedUrl.toString();
}

function parseAuthRedirectUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith('/')) {
    return new URL(trimmed, window.location.origin);
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    return new URL(trimmed);
  }

  return new URL(`https://${trimmed}`);
}
