export type RegistrationMode = 'open' | 'closed' | 'domains';
export type RegistrationPolicy = {
  enabled: boolean;
  mode: RegistrationMode;
  allowedDomains: string[];
  version: number;
};
export type InstanceUser = {
  authUserId: string;
  email: string | null;
  accountId: string | null;
  accountStatus: string | null;
  createdAt: string;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  isAdmin: boolean;
};
export type InstanceUsersPage = { total: number; users: InstanceUser[] };

export function normalizeEmailDomains(input: string): string[] {
  const domains = [...new Set(input.split(/[\s,;]+/).filter(Boolean).map((d) => d.toLowerCase()))].sort();
  const pattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!domains.length || domains.length > 50 || domains.some((d) => d.length > 253 || !pattern.test(d))) {
    throw new Error('Angi 1–50 hele e-postdomener, uten @ eller jokertegn. Bruk punycode for internasjonale domener.');
  }
  return domains;
}

export function emailMatchesPolicy(email: string, policy: RegistrationPolicy): boolean {
  if (!policy.enabled || policy.mode === 'closed') return false;
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && !!parts[0] && !!parts[1]
    && (policy.mode === 'open' || policy.allowedDomains.includes(parts[1]));
}
