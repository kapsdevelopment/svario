export function isUnchangedPasswordError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'same_password';
}
