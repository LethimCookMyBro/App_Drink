import { GAME_QUESTION_TYPE_SET } from "@/shared/config/gameConstants";

export const QUESTION_LIST_DEFAULT_LIMIT = 50;
export const QUESTION_LIST_MAX_LIMIT = 100;
export const QUESTION_LIST_MAX_OFFSET = 100000;
const MAX_SEARCH_LENGTH = 200;

export type QuestionStatusFilter = "active" | "inactive" | "all";
export type QuestionSortOption = "newest" | "usage";

export interface QuestionsListQuery {
  q: string;
  type: string | null;
  level: number | null;
  is18Plus: boolean | null;
  status: QuestionStatusFilter;
  sort: QuestionSortOption;
  limit: number;
  offset: number;
}

export type ParseQuestionsListQueryResult =
  | { ok: true; query: QuestionsListQuery }
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
 * Parses admin question list filters from URL search params.
 *
 * Dimensions are independent by design:
 * - `type`    what the player does (QUESTION/TRUTH/DARE/VOTE/CHAOS)
 * - `level`   exact intensity match (1-3), not a range
 * - `is18Plus` content rating
 * - `status`  active/inactive lifecycle, defaulting to active so legacy
 *             callers keep their previous behaviour
 */
export function parseQuestionsListQuery(
  searchParams: URLSearchParams,
): ParseQuestionsListQueryResult {
  const rawQ = (searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

  const rawType = searchParams.get("type");
  if (rawType && !GAME_QUESTION_TYPE_SET.has(rawType)) {
    return { ok: false, error: "ประเภทคำถามไม่ถูกต้อง" };
  }

  const rawLevel = searchParams.get("level");
  let level: number | null = null;
  if (rawLevel !== null) {
    level = parseBoundedInt(rawLevel, 1, 1, 3);
    if (String(level) !== String(Number.parseInt(rawLevel, 10))) {
      return { ok: false, error: "ระดับความเข้มไม่ถูกต้อง" };
    }
  }

  const rawIs18Plus = searchParams.get("is18Plus");
  let is18Plus: boolean | null = null;
  if (rawIs18Plus === "true") {
    is18Plus = true;
  } else if (rawIs18Plus === "false") {
    is18Plus = false;
  } else if (rawIs18Plus !== null) {
    return { ok: false, error: "ค่า is18Plus ไม่ถูกต้อง" };
  }

  const includeInactive = searchParams.get("includeInactive") === "true";
  const rawStatus = searchParams.get("status");
  let status: QuestionStatusFilter = includeInactive ? "all" : "active";
  if (rawStatus === "active" || rawStatus === "inactive" || rawStatus === "all") {
    status = rawStatus;
  } else if (rawStatus !== null) {
    return { ok: false, error: "ค่า status ไม่ถูกต้อง" };
  }

  const rawSort = searchParams.get("sort");
  let sort: QuestionSortOption = "newest";
  if (rawSort === "usage") {
    sort = "usage";
  } else if (rawSort === "newest") {
    sort = "newest";
  } else if (rawSort !== null) {
    return { ok: false, error: "ค่า sort ไม่ถูกต้อง" };
  }

  return {
    ok: true,
    query: {
      q: rawQ,
      type: rawType || null,
      level,
      is18Plus,
      status,
      sort,
      limit: parseBoundedInt(
        searchParams.get("limit"),
        QUESTION_LIST_DEFAULT_LIMIT,
        1,
        QUESTION_LIST_MAX_LIMIT,
      ),
      offset: parseBoundedInt(searchParams.get("offset"), 0, 0, QUESTION_LIST_MAX_OFFSET),
    },
  };
}

/** Builds the Prisma-compatible where fragment for the parsed filters. */
export function buildQuestionsListWhere(query: QuestionsListQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (query.status === "active") {
    where.isActive = true;
  } else if (query.status === "inactive") {
    where.isActive = false;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.level !== null) {
    where.level = query.level;
  }

  if (query.is18Plus !== null) {
    where.is18Plus = query.is18Plus;
  }

  if (query.q) {
    where.text = { contains: query.q, mode: "insensitive" };
  }

  return where;
}

export function buildQuestionsListOrderBy(sort: QuestionSortOption): Array<Record<string, string>> {
  if (sort === "usage") {
    return [{ usageCount: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  }

  return [{ createdAt: "desc" }, { id: "desc" }];
}
