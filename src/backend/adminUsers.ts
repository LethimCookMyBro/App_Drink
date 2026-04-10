interface AuthProviderUser {
  password: string | null;
  accounts: Array<{ provider: string }>;
}

interface VerifiableUser {
  isVerified: boolean;
  emailVerified: Date | null;
}

export function resolveAuthMethod(user: AuthProviderUser): string {
  const providers = new Set(user.accounts.map((account) => account.provider));
  const hasGoogle = providers.has("google");
  const hasPassword = Boolean(user.password);

  if (hasGoogle && hasPassword) return "Google + Email";
  if (hasGoogle) return "Google";
  if (hasPassword) return "Email";
  if (providers.size > 0) return Array.from(providers).join(", ");
  return "ไม่ระบุ";
}

export function isVerifiedUser(user: VerifiableUser): boolean {
  return Boolean(user.isVerified || user.emailVerified);
}
