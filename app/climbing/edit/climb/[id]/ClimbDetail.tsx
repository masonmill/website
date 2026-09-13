"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { buildClimbDetailRows, computeSendsCount } from "@/lib/climbingLog/climbDetail";
import { formatAttempts } from "@/lib/climbingLog/editorList";
import { BOARD_SHORT_NAMES, type Climb } from "@/lib/climbingLog/climbingLog";
import { SessionForm } from "../../SessionForm";

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
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            aria-label="Log session"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            +
          </button>
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
                {row.sent ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-600" />
                )}
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
    </div>
  );
}
