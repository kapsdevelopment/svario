export function getAuthRedirectUrl(hashPath: string) {
  const normalizedPath = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;

  return `${window.location.origin}${window.location.pathname}#${normalizedPath}`;
}
