"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildEditorListData,
  formatAttempts,
  type DayKeyFn,
  type EditorSessionRow,
} from "@/lib/climbingLog/editorList";
import type { Log, SendLabel } from "@/lib/climbingLog/climbingLog";
import { SessionForm } from "./SessionForm";

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

function SessionRowView({ row }: { row: EditorSessionRow }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
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

  const climbOptions = useMemo(
    () => log.climbs.map((c) => ({ name: c.name, board: c.board, grade: c.grade })),
    [log]
  );

  function handleFormSuccess() {
    setIsFormOpen(false);
    router.refresh();
  }

  const form = isFormOpen && (
    <SessionForm
      climbs={climbOptions}
      onCancel={() => setIsFormOpen(false)}
      onSuccess={handleFormSuccess}
    />
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
                <SessionRowView key={`${row.climbId}-${row.sessionId}`} row={row} />
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
              <div key={climb.climbId} className="flex flex-col gap-0.5 px-3 py-3 sm:px-4">
                <span className="truncate text-base font-medium text-neutral-900 dark:text-neutral-100">
                  {climb.name}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {climb.grade} · {climb.boardShort}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
