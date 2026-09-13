"use server";

import { cookies } from "next/headers";
import { authorize } from "@/lib/auth/authorize";
import { getOwnerGithubId, getSessionSecret } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { applyLogOperation, type GitHubStorageError } from "@/lib/climbingLog/githubStorage";
import { addSession, deleteSession, editClimb, editSession, logSession, type OperationSuccess } from "@/lib/climbingLog/climbingLog";

// ─── Shared result shape ────────────────────────────────────────────────
//
// Every write action in this file (only `logSessionAction` so far; later
// slices add add-session/edit-session/delete-session/edit-climb alongside
// it) returns one of these three outcomes so the client form code can
// handle them uniformly.

export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: "unauthorized"; status: 401 | 403 }
  | { ok: false; kind: "storage"; error: GitHubStorageError };

async function requireOwner(): Promise<{ ok: true } | { ok: false; status: 401 | 403 }> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const result = authorize(sessionValue, {
    sessionSecret: getSessionSecret(),
    ownerGithubId: getOwnerGithubId(),
  });
  if (!result.ok) {
    return { ok: false, status: result.status };
  }
  return { ok: true };
}

export interface LogSessionActionInput {
  name: string;
  board: string;
  grade: string;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

/**
 * Logs a new session, creating the climb first if none with the same
 * trimmed name and board already exists. Used by the "New Session" form
 * opened from the main editor list.
 */
export async function logSessionAction(
  input: LogSessionActionInput
): Promise<ActionResult<OperationSuccess>> {
  const auth = await requireOwner();
  if (!auth.ok) {
    return { ok: false, kind: "unauthorized", status: auth.status };
  }

  const result = await applyLogOperation((log) => logSession(log, input));
  if (!result.ok) {
    return { ok: false, kind: "storage", error: result.error };
  }
  return { ok: true, value: result.value };
}

export interface AddSessionActionInput {
  climbId: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

/**
 * Adds a session to an already-known climb. Used by the "New Session" form
 * opened from a climb's detail page, where the Problem section is omitted.
 */
export async function addSessionAction(
  input: AddSessionActionInput
): Promise<ActionResult<OperationSuccess>> {
  const auth = await requireOwner();
  if (!auth.ok) {
    return { ok: false, kind: "unauthorized", status: auth.status };
  }

  const result = await applyLogOperation((log) =>
    addSession(log, input.climbId, {
      timestamp: input.timestamp,
      attempts: input.attempts,
      incline: input.incline,
      sent: input.sent,
    })
  );
  if (!result.ok) {
    return { ok: false, kind: "storage", error: result.error };
  }
  return { ok: true, value: result.value };
}

export interface EditSessionActionInput {
  climbId: number;
  sessionId: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

/** Edits an existing session's timestamp/attempts/incline/sent. */
export async function editSessionAction(
  input: EditSessionActionInput
): Promise<ActionResult<OperationSuccess>> {
  const auth = await requireOwner();
  if (!auth.ok) {
    return { ok: false, kind: "unauthorized", status: auth.status };
  }

  const result = await applyLogOperation((log) =>
    editSession(log, input.climbId, input.sessionId, {
      timestamp: input.timestamp,
      attempts: input.attempts,
      incline: input.incline,
      sent: input.sent,
    })
  );
  if (!result.ok) {
    return { ok: false, kind: "storage", error: result.error };
  }
  return { ok: true, value: result.value };
}

export interface DeleteSessionActionInput {
  climbId: number;
  sessionId: number;
}

/** Deletes an existing session. */
export async function deleteSessionAction(
  input: DeleteSessionActionInput
): Promise<ActionResult<OperationSuccess>> {
  const auth = await requireOwner();
  if (!auth.ok) {
    return { ok: false, kind: "unauthorized", status: auth.status };
  }

  const result = await applyLogOperation((log) => deleteSession(log, input.climbId, input.sessionId));
  if (!result.ok) {
    return { ok: false, kind: "storage", error: result.error };
  }
  return { ok: true, value: result.value };
}

export interface EditClimbActionInput {
  climbId: number;
  name: string;
  board: string;
  grade: string;
}

/** Edits an existing climb's name/board/grade. */
export async function editClimbAction(
  input: EditClimbActionInput
): Promise<ActionResult<OperationSuccess>> {
  const auth = await requireOwner();
  if (!auth.ok) {
    return { ok: false, kind: "unauthorized", status: auth.status };
  }

  const result = await applyLogOperation((log) =>
    editClimb(log, input.climbId, { name: input.name, board: input.board, grade: input.grade })
  );
  if (!result.ok) {
    return { ok: false, kind: "storage", error: result.error };
  }
  return { ok: true, value: result.value };
}
