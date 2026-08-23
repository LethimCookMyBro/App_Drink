export const ADMIN_USERS_DEFAULT_LIMIT = 50;
export const ADMIN_USERS_MAX_LIMIT = 100;
export const ADMIN_USERS_MAX_OFFSET = 100000;
const MAX_SEARCH_LENGTH = 200;

export interface AdminUsersListQuery {
  q: string;
  limit: number;
  offset: number;
}

export type ParseAdminUsersQueryResult =
  | { ok: true; query: AdminUsersListQuery }
  | { ok: false; error: string };

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

/**
 * Parses admin user list filters. Search runs server-side against the full
 * user table (name or email), not only the rows currently loaded.
 */
export function parseAdminUsersQuery(
  searchParams: URLSearchParams,
): ParseAdminUsersQueryResult {
  return {
    ok: true,
    query: {
      q: (searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH),
      limit: parseBoundedInt(
        searchParams.get("limit"),
        ADMIN_USERS_DEFAULT_LIMIT,
        1,
        ADMIN_USERS_MAX_LIMIT,
      ),
      offset: parseBoundedInt(
        searchParams.get("offset"),
        0,
        0,
        ADMIN_USERS_MAX_OFFSET,
      ),
    },
  };
}
