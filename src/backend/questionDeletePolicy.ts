/**
 * Determines the outcome of a question delete request.
 *
 * Physical/hard delete is permanently disabled to preserve historical
 * GameEvent references (GameEvent.questionId uses ON DELETE SET NULL,
 * so deleting a Question would silently null every referencing event).
 *
 * This function is the single source of truth for the delete policy.
 * The route handler delegates to it; tests verify the policy contract.
 */

export type DeletePolicyResult =
  | { action: "reject"; reason: string; code: string }
  | { action: "deactivate" };

export function resolveDeletePolicy(permanent: boolean): DeletePolicyResult {
  if (permanent) {
    return {
      action: "reject",
      reason:
        "ปิดการลบถาวรเพื่อรักษาประวัติการเล่น กรุณาปิดใช้งานคำถามแทน",
      code: "PERMANENT_DELETE_DISABLED",
    };
  }
  return { action: "deactivate" };
}
