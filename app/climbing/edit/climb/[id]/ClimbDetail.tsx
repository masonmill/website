"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { buildClimbDetailRows, computeSendsCount } from "@/lib/climbingLog/climbDetail";
import { formatAttempts } from "@/lib/climbingLog/editorList";
import { BOARD_SHORT_NAMES, type Climb, type Session } from "@/lib/climbingLog/climbingLog";
import { SessionForm } from "../../SessionForm";
import { ClimbForm } from "../../ClimbForm";
import { deleteSessionAction } from "../../actions";

function formatDayLabel(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClimbDetail({
  climb,
  focusedSessionId,
}: {
  climb: Climb;
  focusedSessionId?: number;
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingClimb, setIsEditingClimb] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const focusedRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => buildClimbDetailRows(climb.sessions), [climb.sessions]);
  const sendsCount = useMemo(() => computeSendsCount(climb.sessions), [climb.sessions]);

  useEffect(() => {
    if (focusedSessionId !== undefined) {
      focusedRef.current?.scrollIntoView({ block: "center" });
    }
  }, [focusedSessionId]);

  function handleFormSuccess() {
    setIsFormOpen(false);
    setEditingSession(null);
    setIsEditingClimb(false);
    router.refresh();
  }

  function handleFormNotFound() {
    setIsFormOpen(false);
    setEditingSession(null);
    setIsEditingClimb(false);
    router.refresh();
  }

  function findSession(sessionId: number): Session | undefined {
    return climb.sessions.find((s) => s.id === sessionId);
  }

  async function handleConfirmDelete() {
    if (!sessionToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    const result = await deleteSessionAction({ climbId: climb.id, sessionId: sessionToDelete.id });

    setDeleting(false);

    if (!result.ok) {
      if (result.kind === "storage" && result.error.type === "not-found") {
        setSessionToDelete(null);
        router.refresh();
        return;
      }
      setDeleteError(
        result.kind === "unauthorized"
          ? result.status === 401
            ? "You need to sign in again to make changes."
            : "This account doesn't have access to edit the log."
          : result.error.message
      );
      return;
    }

    setSessionToDelete(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/climbing/edit" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Back to log
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{climb.name}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {/*
              With no session focused, this is the detail page's only "Edit"
              action, so it reads as "Edit". With a session focused, the
              per-row pencil below already covers "Edit Session" for that
              session, so this becomes a distinctly-labeled "Edit Climb"
              action offered alongside it.
            */}
            <button
              type="button"
              onClick={() => setIsEditingClimb(true)}
              aria-label={focusedSessionId === undefined ? "Edit" : "Edit climb"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              aria-label="Log session"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-lg font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-1 rounded-xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Grade</span>
          <span className="text-sm font-medium">{climb.grade}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Board</span>
          <span className="text-sm font-medium">{BOARD_SHORT_NAMES[climb.board]}</span>
        </div>
        {sendsCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Sends</span>
            <span className="text-sm font-medium">{sendsCount}</span>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Sessions ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="text-neutral-500 dark:text-neutral-400">No sessions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
            {rows.map((row) => (
              <div
                key={row.sessionId}
                ref={row.sessionId === focusedSessionId ? focusedRef : undefined}
                className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDayLabel(row.timestamp)}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatAttempts(row.attempts)} · {row.incline}°
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.sent ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-600" />
                  )}
                  <button
                    type="button"
                    aria-label="Edit session"
                    onClick={() => setEditingSession(findSession(row.sessionId) ?? null)}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete session"
                    onClick={() => {
                      setDeleteError(null);
                      setSessionToDelete(findSession(row.sessionId) ?? null);
                    }}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isFormOpen && (
        <SessionForm
          fixedClimb={{ id: climb.id, name: climb.name, board: climb.board, grade: climb.grade }}
          onCancel={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {isEditingClimb && (
        <ClimbForm
          climb={{ id: climb.id, name: climb.name, board: climb.board, grade: climb.grade }}
          onCancel={() => setIsEditingClimb(false)}
          onSuccess={handleFormSuccess}
          onNotFound={handleFormNotFound}
        />
      )}

      {editingSession && (
        <SessionForm
          editSession={{
            climbId: climb.id,
            sessionId: editingSession.id,
            timestamp: editingSession.timestamp,
            attempts: editingSession.attempts,
            incline: editingSession.incline,
            sent: editingSession.sent,
          }}
          onCancel={() => setEditingSession(null)}
          onSuccess={handleFormSuccess}
          onNotFound={handleFormNotFound}
        />
      )}

      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex w-full flex-col gap-4 rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-sm sm:rounded-2xl dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">Delete Session</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Delete this session? This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                disabled={deleting}
                className="rounded border border-neutral-400 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
