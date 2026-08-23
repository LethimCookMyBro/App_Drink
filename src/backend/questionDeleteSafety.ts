export interface QuestionDeleteReferenceCounts {
  /** Historical GameEvent rows whose `questionId` points at this question. */
  gameEventReferences: number;
  /** Currently ACTIVE GameSession rows that snapshot this question as the current turn. */
  activeSessionReferences: number;
  /** Non-active (PAUSED/COMPLETED/ABANDONED) GameSession rows that still snapshot this question. */
  completedSessionReferences: number;
}

export type PermanentDeleteDenialCode =
  | "QUESTION_HAS_HISTORY"
  | "QUESTION_IN_ACTIVE_SESSION";

export type PermanentDeleteEligibility =
  | { allowed: true }
  | {
      allowed: false;
      code: PermanentDeleteDenialCode;
      message: string;
      counts: QuestionDeleteReferenceCounts;
    };

/**
 * Decides whether a Question may be hard-deleted, looking only at the
 * reference counts already gathered. The function is intentionally pure
 * so it can be unit-tested without a database.
 *
 * Policy:
 *  - Hard delete is only allowed when NOTHING in the system points at the
 *    question. This is the only way to guarantee we never silently lose
 *    history, because the `GameEvent.questionId_fkey` migration uses
 *    `ON DELETE SET NULL` and would otherwise null out every referencing
 *    event.
 *  - "Active session" is its own denial code so the UI can tell the
 *    operator that a live game is at risk, not just a historical record.
 */
export function evaluatePermanentDeleteEligibility(
  counts: QuestionDeleteReferenceCounts,
): PermanentDeleteEligibility {
  if (counts.activeSessionReferences > 0) {
    return {
      allowed: false,
      code: "QUESTION_IN_ACTIVE_SESSION",
      message:
        "คำถามนี้กำลังถูกใช้งานในเซสชันที่ยังเล่นอยู่ — ต้องจบเกมก่อนจึงจะลบได้",
      counts,
    };
  }

  if (
    counts.gameEventReferences > 0 ||
    counts.completedSessionReferences > 0
  ) {
    return {
      allowed: false,
      code: "QUESTION_HAS_HISTORY",
      message:
        "คำถามนี้มีประวัติการเล่นแล้ว การลบถาวรจะทำลายความเชื่อมโยงของประวัติ — ใช้ “ปิดใช้งาน” แทน",
      counts,
    };
  }

  return { allowed: true };
}
