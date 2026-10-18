"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
import { buildClimbDetailRows, computeSendsCount } from "@/lib/climbingLog/climbDetail";
import { formatAttempts } from "@/lib/climbingLog/editorList";
import {
  BOARD_SHORT_NAMES,
  computeSessionLabel,
  type Climb,
  type Session,
} from "@/lib/climbingLog/climbingLog";
import { BoardLogo, GradeTag, GymLogo, InclineTag, SendLabelPill } from "../../../styles";
import { SessionForm, type SessionFormClimbOption } from "../../SessionForm";
import { EditSessionForm } from "../../EditSessionForm";
import { ClimbForm } from "../../ClimbForm";
import { deleteSessionAction } from "../../actions";
import { Dialog, ErrorText, dangerButton, iconButton, primaryButton, secondaryButton } from "../../ui";

function formatDayLabel(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClimbDetail({
  climb,
  allClimbs,
  focusedSessionId,
}: {
  climb: Climb;
  /** Every climb in the log, for name autocomplete when logging a session. */
  allClimbs: SessionFormClimbOption[];
  focusedSessionId?: number;
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingClimb, setIsEditingClimb] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedNotesId, setExpandedNotesId] = useState<number | null>(null);
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

  // Labels need chronological position; rows are newest-first.
  const chron = [...climb.sessions].sort((a, b) => a.timestamp - b.timestamp);
  const labelFor = (sessionId: number) => {
    const idx = chron.findIndex((s) => s.id === sessionId);
    const s = chron[idx];
    return computeSessionLabel({
      sent: s.sent,
      attempts: s.attempts,
      sessionIndex: idx,
      priorSentInClimb: chron.slice(0, idx).some((x) => x.sent),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-[#0a0a0a] pb-5">
        <Link href="/climbing/edit" className="text-sm text-[#737373] hover:text-[#0a0a0a]">
          Editor
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="flex flex-wrap items-center gap-x-2.5 text-[13px] text-[#737373]">
              <GradeTag grade={climb.grade} />
              <span className="flex items-center gap-1.5">
                <BoardLogo board={climb.board} />
                {BOARD_SHORT_NAMES[climb.board]}
              </span>
              {sendsCount > 0 && <span>{sendsCount === 1 ? "1 send" : `${sendsCount} sends`}</span>}
            </span>
            <h1 className="text-[clamp(30px,7vw,40px)] leading-[1.05] font-semibold tracking-[-0.04em] break-words">
              {climb.name}
            </h1>
          </div>
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
              className={`${secondaryButton} gap-2 px-3.5`}
            >
              <Pencil className="size-3.5" />
              <span>{focusedSessionId === undefined ? "Edit" : "Edit climb"}</span>
            </button>
            <button type="button" onClick={() => setIsFormOpen(true)} className={primaryButton}>
              <span className="text-lg leading-none">+</span>
              <span>Log session</span>
            </button>
          </div>
        </div>
      </div>

      <section className="flex flex-col">
        <h2 className="pb-2 text-[15px] font-semibold">
          Sessions
        </h2>
        {rows.length === 0 ? (
          <p className="py-8 text-[#737373]">No sessions yet.</p>
        ) : (
          rows.map((row) => {
            const session = findSession(row.sessionId);
            const hasNotes = row.notes !== undefined && row.notes.length > 0;
            const notesExpanded = expandedNotesId === row.sessionId;
            const focused = row.sessionId === focusedSessionId;
            return (
              <div
                key={row.sessionId}
                ref={focused ? focusedRef : undefined}
                className={`flex flex-col rounded-[10px] ${focused ? "bg-[#f5f5f5]" : "hover:bg-[#fafafa]"}`}
              >
                <div className="flex items-center gap-3 py-3 pr-1.5 pl-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base font-medium">{formatDayLabel(row.timestamp)}</span>
                    <span className="flex flex-wrap items-center gap-x-2.5 text-[13px] text-[#737373]">
                      <InclineTag incline={row.incline} />
                      <span>{formatAttempts(row.attempts)}</span>
                      {session && (
                        <span className="mono flex items-center gap-1.5 text-xs">
                          <GymLogo location={session.location} />
                          {session.location}
                        </span>
                      )}
                    </span>
                  </div>
                  {hasNotes ? (
                    <button
                      type="button"
                      aria-label={notesExpanded ? "Hide notes" : "Show notes"}
                      onClick={() =>
                        setExpandedNotesId((prev) => (prev === row.sessionId ? null : row.sessionId))
                      }
                      className={`${iconButton} ${notesExpanded ? "text-[#0a0a0a]" : ""}`}
                    >
                      <StickyNote className="size-4" />
                    </button>
                  ) : (
                    // Keeps the slot so labels line up with rows that have notes.
                    <span aria-hidden className="size-8 shrink-0" />
                  )}
                  <SendLabelPill label={labelFor(row.sessionId)} />
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label="Edit session"
                      onClick={() => setEditingSession(session ?? null)}
                      className={iconButton}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete session"
                      onClick={() => {
                        setDeleteError(null);
                        setSessionToDelete(session ?? null);
                      }}
                      className={`${iconButton} hover:bg-[#fef2f2] hover:text-[#dc2626]`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {hasNotes && notesExpanded && (
                  <p className="px-3 pb-3 text-sm leading-normal whitespace-pre-wrap text-[#404040]">{row.notes}</p>
                )}
              </div>
            );
          })
        )}
      </section>

      {isFormOpen && (
        <SessionForm
          climbs={allClimbs}
          initialClimb={{ name: climb.name, board: climb.board, grade: climb.grade }}
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
        <EditSessionForm
          session={{
            climbId: climb.id,
            sessionId: editingSession.id,
            timestamp: editingSession.timestamp,
            attempts: editingSession.attempts,
            incline: editingSession.incline,
            sent: editingSession.sent,
            location: editingSession.location,
            notes: editingSession.notes,
          }}
          onCancel={() => setEditingSession(null)}
          onSuccess={handleFormSuccess}
          onNotFound={handleFormNotFound}
        />
      )}

      {sessionToDelete && (
        <Dialog className="max-w-[400px] gap-3.5 p-6">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Delete session</h2>
          <p className="text-sm leading-[1.55] text-[#525252]">
            {climb.sessions.length === 1
              ? "This is the climb's last session — deleting it removes the whole climb. This cannot be undone."
              : "Delete this session? This cannot be undone."}
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
      )}
    </div>
  );
}
