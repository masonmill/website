import type { OperationSuccess } from "@/lib/climbingLog/climbingLog";
import type { ActionResult } from "./actions";

type ActionFailure = Extract<ActionResult<OperationSuccess>, { ok: false }>;

/** User-facing message for a failed editor write. */
export function errorMessage(result: ActionFailure): string {
  if (result.kind === "unauthorized") {
    return result.status === 401
      ? "You need to sign in again to make changes."
      : "This account doesn't have access to edit the log.";
  }
  return result.error.message;
}

/** True when the target climb/session no longer exists, so the caller should reload. */
export function isNotFound(result: ActionFailure): boolean {
  return result.kind === "storage" && result.error.type === "not-found";
}
