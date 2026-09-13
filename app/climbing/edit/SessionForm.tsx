"use client";

import { useMemo, useState } from "react";
import { BOARDS, GRADES, type Board, type Grade } from "@/lib/climbingLog/climbingLog";
import { computeEditedSessionTimestamp, computeNewSessionTimestamp, toDateInputValue } from "@/lib/climbingLog/timestamp";
import { addSessionAction, editSessionAction, logSessionAction, type ActionResult } from "./actions";
import type { OperationSuccess } from "@/lib/climbingLog/climbingLog";

// ─── Types ────────────────────────────────────────────────────────────────

/** Minimal climb identity used for name autocomplete and board/grade locking. */
export interface SessionFormClimbOption {
  name: string;
  board: Board;
  grade: Grade;
}

/** Identifies an already-known climb the session is being added to. */
export interface SessionFormFixedClimb {
  id: number;
  name: string;
  board: Board;
  grade: Grade;
}

/** Identifies an existing session being edited. */
export interface SessionFormEditSession {
  climbId: number;
  sessionId: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

export interface SessionFormProps {
  /**
   * All known climbs, used for name autocomplete. Only used (and only
   * required) when `fixedClimb` is not set.
   */
  climbs?: SessionFormClimbOption[];
  /**
   * When set, the form is in "add session to a known climb" mode (opened
   * from a climb's detail page): the Problem section (name/board/grade) is
   * omitted and the session is added directly to this climb via
   * `addSessionAction` instead of `logSessionAction`.
   */
  fixedClimb?: SessionFormFixedClimb;
  /**
   * When set, the form is in "edit an existing session" mode: prefilled with
   * the session's date/attempts/incline/sent, the Problem section is
   * omitted, and the confirm button reads "Save". Takes precedence over
   * `fixedClimb`.
   */
  editSession?: SessionFormEditSession;
  onCancel: () => void;
  /** Called after a successful save so the caller can refresh data and close the form. */
  onSuccess: () => void;
  /**
   * Called when the save fails because the target climb/session no longer
   * exists. The caller should reload the latest data and close the form.
   */
  onNotFound?: () => void;
}

const DEFAULT_BOARD: Board = "MoonBoard 2019";
const DEFAULT_GRADE: Grade = "6a+/V3";

function errorMessage(result: Extract<ActionResult<OperationSuccess>, { ok: false }>): string {
  if (result.kind === "unauthorized") {
    return result.status === 401
      ? "You need to sign in again to make changes."
      : "This account doesn't have access to edit the log.";
  }
  if (result.error.type === "github") return result.error.message;
  return result.error.message;
}

function isNotFound(result: Extract<ActionResult<OperationSuccess>, { ok: false }>): boolean {
  return result.kind === "storage" && result.error.type === "not-found";
}

// ─── Component ──────────────────────────────────────────────────────────

export function SessionForm({ climbs = [], fixedClimb, editSession, onCancel, onSuccess, onNotFound }: SessionFormProps) {
  const [name, setName] = useState(fixedClimb?.name ?? "");
  const [board, setBoard] = useState<Board>(fixedClimb?.board ?? DEFAULT_BOARD);
  const [grade, setGrade] = useState<Grade>(fixedClimb?.grade ?? DEFAULT_GRADE);
  const [locked, setLocked] = useState(fixedClimb != null);
  const [date, setDate] = useState(() =>
    editSession ? toDateInputValue(new Date(editSession.timestamp * 1000)) : toDateInputValue(new Date())
  );
  const [attempts, setAttempts] = useState(editSession?.attempts ?? 1);
  const [incline, setIncline] = useState(editSession?.incline ?? 40);
  const [sent, setSent] = useState(editSession?.sent ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();

  const suggestions = useMemo(() => {
    if (fixedClimb || trimmedName.length === 0) return [];
    const lower = trimmedName.toLowerCase();
    return climbs.filter((c) => c.name.toLowerCase().includes(lower));
  }, [climbs, fixedClimb, trimmedName]);

  function handleNameChange(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setName(value);
      setLocked(false);
      return;
    }
    // A trimmed, case-sensitive exact name match auto-selects and locks
    // that climb's board/grade (mirrors the iOS app's updateSuggestions).
    const exact = climbs.find((c) => c.name === trimmed);
    if (exact) {
      selectSuggestion(exact);
      return;
    }
    setName(value);
    setLocked(false);
  }

  function selectSuggestion(climb: SessionFormClimbOption) {
    setName(climb.name);
    setBoard(climb.board);
    setGrade(climb.grade);
    setLocked(true);
  }

  const canSubmit = (editSession != null || trimmedName.length > 0) && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = editSession
      ? await editSessionAction({
          climbId: editSession.climbId,
          sessionId: editSession.sessionId,
          timestamp: computeEditedSessionTimestamp(editSession.timestamp, date),
          attempts,
          incline,
          sent,
        })
      : fixedClimb
        ? await addSessionAction({
            climbId: fixedClimb.id,
            timestamp: computeNewSessionTimestamp(date, new Date()),
            attempts,
            incline,
            sent,
          })
        : await logSessionAction({
            name,
            board,
            grade,
            timestamp: computeNewSessionTimestamp(date, new Date()),
            attempts,
            incline,
            sent,
          });

    setSubmitting(false);

    if (!result.ok) {
      if (isNotFound(result) && onNotFound) {
        onNotFound();
        return;
      }
      setError(errorMessage(result));
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full flex-col gap-6 overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-neutral-900"
      >
        <h2 className="text-lg font-semibold">{editSession ? "Edit Session" : "New Session"}</h2>

        {!fixedClimb && !editSession && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Problem
          </h3>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              autoComplete="off"
            />
          </label>

          {!locked && trimmedName.length > 0 && suggestions.length > 0 && (
            <ul className="flex flex-col divide-y divide-neutral-100 rounded border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
              {suggestions.map((climb, i) => (
                <li key={`${climb.name}-${climb.board}-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(climb)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span>{climb.name}</span>
                    <span className="text-neutral-500">
                      {climb.grade} · {climb.board}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Board</span>
            <select
              value={board}
              disabled={locked}
              onChange={(e) => setBoard(e.target.value as Board)}
              className="rounded border border-neutral-300 px-3 py-2 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {BOARDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Grade</span>
            <select
              value={grade}
              disabled={locked}
              onChange={(e) => setGrade(e.target.value as Grade)}
              className="rounded border border-neutral-300 px-3 py-2 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </section>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Session
          </h3>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Attempts</span>
            <input
              type="number"
              min={1}
              max={999}
              value={attempts}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isInteger(value)) {
                  setAttempts(Math.min(999, Math.max(1, value)));
                }
              }}
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-center justify-between text-sm text-neutral-500">
              <span>Incline</span>
              <span>{incline}°</span>
            </span>
            <input
              type="range"
              min={0}
              max={70}
              step={1}
              value={incline}
              onChange={(e) => setIncline(Number(e.target.value))}
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Sent</span>
            <input
              type="checkbox"
              checked={sent}
              onChange={(e) => setSent(e.target.checked)}
              className="h-5 w-5"
            />
          </label>
        </section>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded border border-neutral-400 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {editSession ? "Save" : "Log"}
          </button>
        </div>
      </form>
    </div>
  );
}
