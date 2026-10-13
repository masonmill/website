"use client";

import { useMemo, useState } from "react";
import { BOARDS, BOARD_SHORT_NAMES, GRADES, LOCATIONS, NOTES_MAX_CODE_POINTS, type Board, type Grade, type Location } from "@/lib/climbingLog/climbingLog";
import { computeEditedSessionTimestamp, computeNewSessionTimestamp, toDateInputValue } from "@/lib/climbingLog/timestamp";
import { addSessionAction, editSessionAction, logSessionAction, type ActionResult } from "./actions";
import type { OperationSuccess } from "@/lib/climbingLog/climbingLog";
import { BoardLogo, GRADE_COLORS, GradeTag } from "../styles";
import { Chip, Dialog, ErrorText, FieldLabel, SectionHeading, inputClass, primaryButton, secondaryButton, textareaClass } from "./ui";

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
  location: Location;
  notes?: string;
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
  const [attempts, setAttempts] = useState<number | "">(editSession?.attempts ?? 1);
  const [incline, setIncline] = useState(editSession?.incline ?? 40);
  const [sent, setSent] = useState(editSession?.sent ?? false);
  const [location, setLocation] = useState<Location | "">(editSession?.location ?? "");
  const [notes, setNotes] = useState(editSession?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesCodePointCount = useMemo(() => Array.from(notes.trim()).length, [notes]);
  const notesTooLong = notesCodePointCount > NOTES_MAX_CODE_POINTS;

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

  const canSubmit =
    (editSession != null || trimmedName.length > 0) &&
    location !== "" &&
    attempts !== "" &&
    !submitting &&
    !notesTooLong;

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
          location,
          notes,
        })
      : fixedClimb
        ? await addSessionAction({
            climbId: fixedClimb.id,
            timestamp: computeNewSessionTimestamp(date, new Date()),
            attempts,
            incline,
            sent,
            location,
            notes,
          })
        : await logSessionAction({
            name,
            board,
            grade,
            timestamp: computeNewSessionTimestamp(date, new Date()),
            attempts,
            incline,
            sent,
            location,
            notes,
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
    <Dialog>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-7">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{editSession ? "Edit session" : "New session"}</h2>

        {!fixedClimb && !editSession && (
          <section className="flex flex-col gap-3.5">
            <SectionHeading>Problem</SectionHeading>

            <label className="flex flex-col gap-1.5">
              <FieldLabel>Name</FieldLabel>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </label>

            {!locked && trimmedName.length > 0 && suggestions.length > 0 && (
              <ul className="-mt-1.5 flex flex-col divide-y divide-[#f0f0f0] overflow-hidden rounded-[10px] border border-[#e5e5e5]">
                {suggestions.map((climb, i) => (
                  <li key={`${climb.name}-${climb.board}-${i}`}>
                    <button
                      type="button"
                      onClick={() => selectSuggestion(climb)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[#fafafa]"
                    >
                      <span className="truncate">{climb.name}</span>
                      <span className="flex shrink-0 items-center gap-2.5 text-[13px] text-[#737373]">
                        <GradeTag grade={climb.grade} />
                        <span className="flex items-center gap-1.5">
                          <BoardLogo board={climb.board} />
                          {BOARD_SHORT_NAMES[climb.board]}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Board</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {BOARDS.map((b) => (
                  <Chip key={b} active={board === b} disabled={locked} onClick={() => setBoard(b)}>
                    <BoardLogo board={b} inverted={board === b} />
                    {BOARD_SHORT_NAMES[b]}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Grade</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {GRADES.map((g) => (
                  <Chip key={g} active={grade === g} disabled={locked} onClick={() => setGrade(g)} className="mono px-2.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ background: GRADE_COLORS[g] }} />
                    {g}
                  </Chip>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3.5">
          <SectionHeading>Session</SectionHeading>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </label>

            <label className="flex flex-col gap-1.5">
              <FieldLabel>Attempts</FieldLabel>
              <input
                type="number"
                min={1}
                max={999}
                value={attempts}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setAttempts("");
                    return;
                  }
                  const value = Number(e.target.value);
                  if (Number.isInteger(value)) {
                    setAttempts(Math.min(999, Math.max(1, value)));
                  }
                }}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>
              <span>Incline</span>
              <span className="mono text-[#0a0a0a]">{incline}°</span>
            </FieldLabel>
            <input
              type="range"
              min={0}
              max={70}
              step={1}
              value={incline}
              onChange={(e) => setIncline(Number(e.target.value))}
              className="accent-[#0a0a0a]"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Result</FieldLabel>
            <div className="flex gap-1.5">
              <Chip active={!sent} onClick={() => setSent(false)} className="h-9 flex-1 font-semibold">
                Project
              </Chip>
              <Chip active={sent} activeColor="#16a34a" onClick={() => setSent(true)} className="h-9 flex-1 font-semibold">
                Sent
              </Chip>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>Location</FieldLabel>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as Location)}
              required
              className={`${inputClass} px-2.5`}
            >
              <option value="" disabled>
                Select a location
              </option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>
              <span>Notes</span>
              <span className={`mono text-xs ${notesTooLong ? "text-[#dc2626]" : "text-[#a3a3a3]"}`}>
                {notesCodePointCount}/{NOTES_MAX_CODE_POINTS}
              </span>
            </FieldLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={textareaClass} />
            {notesTooLong && (
              <span className="text-sm text-[#dc2626]">Notes must be at most {NOTES_MAX_CODE_POINTS} characters.</span>
            )}
          </label>
        </section>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={submitting} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className={`${primaryButton} px-5`}>
            {editSession ? "Save" : "Log"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
