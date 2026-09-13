"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  buildEditorListData,
  formatAttempts,
  type DayKeyFn,
  type EditorSessionRow,
} from "@/lib/climbingLog/editorList";
import type { Log, SendLabel } from "@/lib/climbingLog/climbingLog";
import { SessionForm } from "./SessionForm";
import { deleteSessionAction } from "./actions";

// ─── Local (browser) day grouping ──────────────────────────────────────────
//
// Grouping/formatting must reflect the browser's local time zone, so it
// happens here in a client component using the browser's Date/Intl APIs
// rather than on the server.

const localDayKey: DayKeyFn = (timestampSeconds) => {
  const d = new Date(timestampSeconds * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function formatDayLabel(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Styling ────────────────────────────────────────────────────────────

const LABEL_STYLES: Partial<Record<SendLabel, string>> = {
  Flash: "text-sm font-semibold text-green-600 dark:text-green-400",
  "Day flash": "text-sm font-semibold text-green-600 dark:text-green-400",
  Sent: "text-sm font-semibold text-green-600 dark:text-green-400",
  Repeat: "text-sm font-semibold text-blue-600 dark:text-blue-400",
  // "Project" intentionally has no style — it is hidden entirely.
};

function SessionLabel({ label }: { label: SendLabel }) {
  if (label === "Project") return null;
  return <span className={LABEL_STYLES[label]}>{label}</span>;
}

function SessionRowView({ row, onDelete }: { row: EditorSessionRow; onDelete: (row: EditorSessionRow) => void }) {
  return (
    <div className="flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800">
      <Link
        href={`/climbing/edit/climb/${row.climbId}?session=${row.sessionId}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-3 sm:px-4"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-medium text-neutral-900 dark:text-neutral-100">
            {row.name}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {row.grade} · {row.boardShort} · {row.incline}° · {formatAttempts(row.attempts)}
          </span>
        </div>
        <div className="shrink-0">
          <SessionLabel label={row.label} />
        </div>
      </Link>
      <button
        type="button"
        aria-label="Delete session"
        onClick={() => onDelete(row)}
        className="mr-2 shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────

function EmptyState({ onLogSession }: { onLogSession: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h2 className="text-lg font-semibold">No Climbs</h2>
      <p className="text-neutral-500 dark:text-neutral-400">
        Log your first session to get started.
      </p>
      <button
        type="button"
        onClick={onLogSession}
        className="mt-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Log Session
      </button>
    </div>
  );
}

// ─── Main list ──────────────────────────────────────────────────────────

export function EditorLogList({ log }: { log: Log }) {
  const router = useRouter();
  const data = useMemo(() => buildEditorListData(log, localDayKey), [log]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<EditorSessionRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const climbOptions = useMemo(
    () => log.climbs.map((c) => ({ name: c.name, board: c.board, grade: c.grade })),
    [log]
  );

  function handleFormSuccess() {
    setIsFormOpen(false);
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!sessionToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    const result = await deleteSessionAction({
      climbId: sessionToDelete.climbId,
      sessionId: sessionToDelete.sessionId,
    });

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

  const form = isFormOpen && (
    <SessionForm
      climbs={climbOptions}
      onCancel={() => setIsFormOpen(false)}
      onSuccess={handleFormSuccess}
    />
  );

  const deleteDialog = sessionToDelete && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex w-full flex-col gap-4 rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-sm sm:rounded-2xl dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Delete Session</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Delete this session for &quot;{sessionToDelete.name}&quot;? This cannot be undone.
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
  );

  if (log.climbs.length === 0) {
    return (
      <>
        <EmptyState onLogSession={() => setIsFormOpen(true)} />
        {form}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {form}
      {deleteDialog}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          aria-label="Log session"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-lg font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          +
        </button>
      </div>
      <div className="flex flex-col gap-6">
        {data.dayGroups.map((group) => (
          <div key={group.dayKey}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              {formatDayLabel(group.rows[0].timestamp)}
            </p>
            <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
              {group.rows.map((row) => (
                <SessionRowView
                  key={`${row.climbId}-${row.sessionId}`}
                  row={row}
                  onDelete={(r) => {
                    setDeleteError(null);
                    setSessionToDelete(r);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {data.climbsWithNoSessions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            No Sessions
          </p>
          <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
            {data.climbsWithNoSessions.map((climb) => (
              <Link
                key={climb.climbId}
                href={`/climbing/edit/climb/${climb.climbId}`}
                className="flex flex-col gap-0.5 px-3 py-3 hover:bg-neutral-50 sm:px-4 dark:hover:bg-neutral-800"
              >
                <span className="truncate text-base font-medium text-neutral-900 dark:text-neutral-100">
                  {climb.name}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {climb.grade} · {climb.boardShort}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
