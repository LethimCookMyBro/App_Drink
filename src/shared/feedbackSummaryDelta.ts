/**
 * Pure helper for computing feedback summary deltas after mutations.
 * Used by Admin Feedback page and tests.
 */

export type FeedbackStatus =
  | "ALL"
  | "PENDING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export type FeedbackSummary = Record<FeedbackStatus, number>;

/**
 * Apply a status change delta to the summary.
 * Preserves the server-authoritative ALL count.
 * Only adjusts the old and new status counts.
 */
export function applyFeedbackStatusDelta(
  summary: FeedbackSummary,
  oldStatus: string | undefined,
  newStatus: string,
): FeedbackSummary {
  if (!oldStatus || oldStatus === newStatus) return summary;

  const next = { ...summary };
  next[oldStatus as FeedbackStatus] = Math.max(
    0,
    (next[oldStatus as FeedbackStatus] ?? 0) - 1,
  );
  next[newStatus as FeedbackStatus] =
    (next[newStatus as FeedbackStatus] ?? 0) + 1;
  return next;
}

/**
 * Apply a delete delta to the summary.
 * Decrements the deleted item's status count and the ALL count.
 */
export function applyFeedbackDeleteDelta(
  summary: FeedbackSummary,
  deletedStatus: string,
): FeedbackSummary {
  const next = { ...summary };
  next[deletedStatus as FeedbackStatus] = Math.max(
    0,
    (next[deletedStatus as FeedbackStatus] ?? 0) - 1,
  );
  next.ALL = Math.max(0, next.ALL - 1);
  return next;
}
