export const ADMIN_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;

export type AdminRoleName = (typeof ADMIN_ROLES)[number];

const ADMIN_ROLE_RANK: Record<AdminRoleName, number> = {
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function normalizeAdminRole(role: string | null | undefined): AdminRoleName | null {
  return ADMIN_ROLES.find((candidate) => candidate === role) ?? null;
}

export function hasAdminRole(
  role: string | null | undefined,
  minimumRole: AdminRoleName,
): boolean {
  const normalizedRole = normalizeAdminRole(role);
  if (!normalizedRole) return false;

  return ADMIN_ROLE_RANK[normalizedRole] >= ADMIN_ROLE_RANK[minimumRole];
}
