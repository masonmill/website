"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StickyNote, Trash2 } from "lucide-react";
import {
  buildEditorListData,
  formatAttempts,
  type DayKeyFn,
  type EditorSessionRow,
} from "@/lib/climbingLog/editorList";
import { LOCATION_SHORT_NAMES, type Log } from "@/lib/climbingLog/climbingLog";
import { BoardLogo, GradeTag, SendLabelPill } from "../styles";
import { SessionForm } from "./SessionForm";
import { deleteSessionAction } from "./actions";
import { Dialog, ErrorText, dangerButton, iconButton, primaryButton, secondaryButton } from "./ui";

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
  return new Date(timestampSeconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const yearOf = (timestampSeconds: number) => new Date(timestampSeconds * 1000).getFullYear();

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;

function SessionRowView({
  row,
  onDelete,
  notesExpanded,
  onToggleNotes,
}: {
  row: EditorSessionRow;
  onDelete: (row: EditorSessionRow) => void;
  notesExpanded: boolean;
  onToggleNotes: (row: EditorSessionRow) => void;
}) {
  const hasNotes = row.notes !== undefined && row.notes.length > 0;
  return (
    <div className="flex flex-col rounded-[10px] hover:bg-[#fafafa]">
      <div className="flex items-center gap-1 pr-1.5">
        <Link
          href={`/climbing/edit/climb/${row.climbId}?session=${row.sessionId}`}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 p-3"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-base font-medium">{row.name}</span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-[#737373]">
              <GradeTag grade={row.grade} />
              <span className="flex items-center gap-1.5">
                <BoardLogo board={row.board} />
                {row.boardShort}
              </span>
              <span>{row.incline}°</span>
              <span>{formatAttempts(row.attempts)}</span>
            </span>
          </div>
          <SendLabelPill label={row.label} />
        </Link>
        {hasNotes && (
          <button
            type="button"
            aria-label={notesExpanded ? "Hide notes" : "Show notes"}
            onClick={() => onToggleNotes(row)}
            className={`${iconButton} ${notesExpanded ? "text-[#0a0a0a]" : ""}`}
          >
            <StickyNote className="size-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete session"
          onClick={() => onDelete(row)}
          className={`${iconButton} hover:bg-[#fef2f2] hover:text-[#dc2626]`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {hasNotes && notesExpanded && (
        <p className="px-3 pb-3 text-sm leading-normal whitespace-pre-wrap text-[#404040]">{row.notes}</p>
      )}
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
  const [expandedNotesKey, setExpandedNotesKey] = useState<string | null>(null);

  const climbOptions = useMemo(
    () => log.climbs.map((c) => ({ name: c.name, board: c.board, grade: c.grade })),
    [log]
  );

  const findSession = (row: EditorSessionRow) =>
    log.climbs.find((c) => c.id === row.climbId)?.sessions.find((s) => s.id === row.sessionId);

  const isLastSessionOfClimb = (row: EditorSessionRow) =>
    log.climbs.find((c) => c.id === row.climbId)?.sessions.length === 1;

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
    <Dialog className="max-w-[400px] gap-3.5 p-6">
      <h2 className="text-xl font-semibold tracking-[-0.02em]">Delete session</h2>
      <p className="text-sm leading-[1.55] text-[#525252]">
        {isLastSessionOfClimb(sessionToDelete)
          ? `This is the last session for "${sessionToDelete.name}" — deleting it removes the whole climb. This cannot be undone.`
          : `Delete this session for "${sessionToDelete.name}"? This cannot be undone.`}
      </p>
      {deleteError && <ErrorText>{deleteError}</ErrorText>}
      <div className="mt-1.5 flex justify-end gap-2">
        <button type="button" onClick={() => setSessionToDelete(null)} disabled={deleting} className={secondaryButton}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirmDelete} disabled={deleting} className={dangerButton}>
          Delete
        </button>
      </div>
    </Dialog>
  );

  const sessionCount = data.dayGroups.length;

  return (
    <>
      {form}
      {deleteDialog}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0a0a0a] pb-5">
        <div className="flex flex-col gap-2.5">
          <span className="mono text-[13px] text-[#737373]">
            {plural(log.climbs.length, "problem")} · {plural(sessionCount, "session")}
          </span>
          <h1 className="text-[clamp(34px,8vw,44px)] leading-none font-semibold tracking-[-0.04em]">Editor</h1>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)} className={primaryButton}>
          <span className="text-lg leading-none">+</span>
          <span>Log session</span>
        </button>
      </div>

      {log.climbs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <h2 className="text-lg font-semibold">No climbs</h2>
          <p className="text-[#737373]">Log your first session to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {data.dayGroups.map((group, gi) => {
            const first = group.rows[0];
            const next = data.dayGroups[gi + 1];
            const showYear = !next || yearOf(next.rows[0].timestamp) !== yearOf(first.timestamp);
            const location = findSession(first)?.location;
            return (
              <div key={group.dayKey}>
                <div className="flex flex-wrap gap-x-7 gap-y-1 border-b border-[#f0f0f0] py-5">
                  <div className="flex flex-[0_0_120px] flex-col gap-[3px] pt-3">
                    <span className="text-[15px] font-semibold tracking-[-0.01em]">{formatDayLabel(first.timestamp)}</span>
                    {location && (
                      <span className="mono text-xs whitespace-nowrap text-[#737373]">
                        {LOCATION_SHORT_NAMES[location] ?? location}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-[1_1_400px] flex-col">
                    {group.rows.map((row) => {
                      const key = `${row.climbId}-${row.sessionId}`;
                      return (
                        <SessionRowView
                          key={key}
                          row={row}
                          onDelete={(r) => {
                            setDeleteError(null);
                            setSessionToDelete(r);
                          }}
                          notesExpanded={expandedNotesKey === key}
                          onToggleNotes={() => setExpandedNotesKey((prev) => (prev === key ? null : key))}
                        />
                      );
                    })}
                  </div>
                </div>
                {showYear && (
                  <div className="flex items-center gap-3.5 pt-7 pb-1">
                    <span className="text-[15px] font-semibold tracking-[-0.01em]">{yearOf(first.timestamp)}</span>
                    <span className="h-px flex-1 bg-[#e5e5e5]" />
                  </div>
                )}
              </div>
            );
          })}

          {data.climbsWithNoSessions.length > 0 && (
            <div className="flex flex-wrap gap-x-7 gap-y-1 py-5">
              <div className="flex-[0_0_120px] pt-3 text-[15px] font-semibold tracking-[-0.01em]">No sessions</div>
              <div className="flex min-w-0 flex-[1_1_400px] flex-col">
                {data.climbsWithNoSessions.map((climb) => (
                  <Link
                    key={climb.climbId}
                    href={`/climbing/edit/climb/${climb.climbId}`}
                    className="flex flex-col gap-1 rounded-[10px] p-3 hover:bg-[#fafafa]"
                  >
                    <span className="truncate text-base font-medium">{climb.name}</span>
                    <span className="flex items-center gap-2.5 text-[13px] text-[#737373]">
                      <GradeTag grade={climb.grade} />
                      <span className="flex items-center gap-1.5">
                        <BoardLogo board={climb.board} />
                        {climb.boardShort}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
