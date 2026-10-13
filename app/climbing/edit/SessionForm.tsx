"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  BOARDS,
  BOARD_SHORT_NAMES,
  GRADES,
  LOCATIONS,
  NOTES_MAX_CODE_POINTS,
  type Board,
  type Grade,
  type Location,
} from "@/lib/climbingLog/climbingLog";
import { computeBatchSessionTimestamps, toDateInputValue } from "@/lib/climbingLog/timestamp";
import { BoardLogo, BoardTag, GRADE_COLORS, GradeTag, InclineTag } from "../styles";
import { errorMessage, isNotFound } from "./actionErrors";
import { logSessionsAction } from "./actions";
import {
  Chip,
  Dialog,
  ErrorText,
  FieldLabel,
  SectionHeading,
  iconButton,
  inputClass,
  primaryButton,
  secondaryButton,
  textareaClass,
} from "./ui";

// ─── Types ────────────────────────────────────────────────────────────────

/** Minimal climb identity used for name autocomplete and board/grade locking. */
export interface SessionFormClimbOption {
  name: string;
  board: Board;
  grade: Grade;
}

export interface SessionFormProps {
  /** All known climbs, used for name autocomplete. */
  climbs: SessionFormClimbOption[];
  /**
   * Pre-fills the first climb (opened from a climb's detail page). Logging
   * by its exact name and board adds the session to that existing climb.
   */
  initialClimb?: SessionFormClimbOption;
  onCancel: () => void;
  /** Called after a successful save so the caller can refresh data and close the form. */
  onSuccess: () => void;
}

/** One climb queued in the session, before the session is saved. */
interface ClimbEntry {
  key: number;
  name: string;
  board: Board;
  grade: Grade;
  attempts: number;
  incline: number;
  sent: boolean;
  notes: string;
}

const DEFAULT_BOARD: Board = "MoonBoard 2019";
const DEFAULT_GRADE: Grade = "6a+/V3";

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;

// ─── Component ──────────────────────────────────────────────────────────

/**
 * Logs one gym visit: a date and location shared by every climb, plus the
 * climbs themselves, added one at a time. "Save session" writes them all in
 * a single commit.
 */
export function SessionForm({ climbs, initialClimb, onCancel, onSuccess }: SessionFormProps) {
  // Shared by every climb in the session.
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [location, setLocation] = useState<Location | "">("");

  // Climbs added so far.
  const [entries, setEntries] = useState<ClimbEntry[]>([]);
  const nextKey = useRef(0);

  // The climb currently being entered.
  const [name, setName] = useState(initialClimb?.name ?? "");
  const [board, setBoard] = useState<Board>(initialClimb?.board ?? DEFAULT_BOARD);
  const [grade, setGrade] = useState<Grade>(initialClimb?.grade ?? DEFAULT_GRADE);
  const [locked, setLocked] = useState(initialClimb != null);
  const [attempts, setAttempts] = useState<number | "">(1);
  const [incline, setIncline] = useState(40);
  const [sent, setSent] = useState(false);
  const [notes, setNotes] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesCodePointCount = useMemo(() => Array.from(notes.trim()).length, [notes]);
  const notesTooLong = notesCodePointCount > NOTES_MAX_CODE_POINTS;
  const trimmedName = name.trim();

  // Climbs created earlier in this session count as known, so logging one
  // again locks it to the same board and grade.
  const knownClimbs = useMemo(() => {
    const queued = entries.filter((e) => !climbs.some((c) => c.name === e.name && c.board === e.board));
    return [...climbs, ...queued.map(({ name, board, grade }) => ({ name, board, grade }))];
  }, [climbs, entries]);

  const suggestions = useMemo(() => {
    if (trimmedName.length === 0) return [];
    const lower = trimmedName.toLowerCase();
    return knownClimbs.filter((c) => c.name.toLowerCase().includes(lower));
  }, [knownClimbs, trimmedName]);

  function handleNameChange(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setName(value);
      setLocked(false);
      return;
    }
    // A trimmed, case-sensitive exact name match auto-selects and locks
    // that climb's board/grade (mirrors the iOS app's updateSuggestions).
    const exact = knownClimbs.find((c) => c.name === trimmed);
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

  const currentIsValid = trimmedName.length > 0 && attempts !== "" && !notesTooLong;
  // Leaving the climb fields blank is fine; anything typed must be valid,
  // because Save also includes the climb still being entered.
  const currentIsBlank = trimmedName.length === 0;
  const pendingEntries = currentIsValid ? entries.length + 1 : entries.length;
  const canSave =
    location !== "" && pendingEntries > 0 && (currentIsBlank || currentIsValid) && !submitting;

  function currentEntry(): ClimbEntry {
    return {
      key: nextKey.current++,
      name: trimmedName,
      board,
      grade,
      attempts: attempts as number,
      incline,
      sent,
      notes,
    };
  }

  function handleAddClimb() {
    if (!currentIsValid) return;
    setEntries((prev) => [...prev, currentEntry()]);
    // Board, grade and incline usually carry over between climbs on one wall.
    setName("");
    setLocked(false);
    setAttempts(1);
    setSent(false);
    setNotes("");
    setError(null);
    nameInput.current?.focus();
  }

  function handleCancel() {
    if (entries.length > 0 && !window.confirm(`Discard ${plural(entries.length, "climb")} in this session?`)) return;
    onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (location === "" || !canSave) return;
    setSubmitting(true);
    setError(null);

    const all = currentIsValid ? [...entries, currentEntry()] : entries;
    const timestamps = computeBatchSessionTimestamps(date, new Date(), all.length);
    const result = await logSessionsAction(
      all.map((entry, i) => ({
        name: entry.name,
        board: entry.board,
        grade: entry.grade,
        timestamp: timestamps[i],
        attempts: entry.attempts,
        incline: entry.incline,
        sent: entry.sent,
        location,
        notes: entry.notes,
      }))
    );

    setSubmitting(false);

    if (!result.ok) {
      if (currentIsValid) {
        // The in-progress climb was sent with the batch; keep it queued
        // rather than losing it, so a retry includes it.
        setEntries(all);
        setName("");
        setLocked(false);
        setNotes("");
      }
      setError(isNotFound(result) ? "The log changed while you were editing. Close and reopen to retry." : errorMessage(result));
      return;
    }

    onSuccess();
  }

  return (
    <Dialog>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-7">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">New session</h2>

        <section className="flex flex-col gap-3.5">
          <SectionHeading>Session</SectionHeading>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </label>
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
          </div>
        </section>

        {entries.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <SectionHeading>Climbs · {entries.length}</SectionHeading>
            <ul className="flex flex-col divide-y divide-[#f0f0f0] rounded-[10px] border border-[#e5e5e5]">
              {entries.map((entry) => (
                <li key={entry.key} className="flex items-center gap-2 py-2 pr-1.5 pl-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{entry.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2.5 text-xs text-[#737373]">
                      <GradeTag grade={entry.grade} />
                      <BoardTag board={entry.board} short={BOARD_SHORT_NAMES[entry.board]} />
                      <InclineTag incline={entry.incline} />
                      <span>{plural(entry.attempts, "attempt")}</span>
                    </span>
                  </div>
                  <span className={`w-14 text-right text-xs font-semibold ${entry.sent ? "text-[#16a34a]" : "text-[#a3a3a3]"}`}>
                    {entry.sent ? "Sent" : "Project"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${entry.name}`}
                    onClick={() => setEntries((prev) => prev.filter((e) => e.key !== entry.key))}
                    className={`${iconButton} hover:bg-[#fef2f2] hover:text-[#dc2626]`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3.5">
          <SectionHeading>{entries.length > 0 ? `Climb ${entries.length + 1}` : "Climb"}</SectionHeading>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>Name</FieldLabel>
            <input
              ref={nameInput}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the climb and keeps the session open.
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddClimb();
                }
              }}
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
                      <BoardTag board={climb.board} short={BOARD_SHORT_NAMES[climb.board]} />
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

          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
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
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Result</FieldLabel>
              <div className="flex gap-1.5">
                <Chip active={!sent} onClick={() => setSent(false)} className="h-10 flex-1 font-semibold">
                  Project
                </Chip>
                <Chip active={sent} activeColor="#16a34a" onClick={() => setSent(true)} className="h-10 flex-1 font-semibold">
                  Sent
                </Chip>
              </div>
            </div>
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

          <label className="flex flex-col gap-1.5">
            <FieldLabel>
              <span>Notes</span>
              <span className={`mono text-xs ${notesTooLong ? "text-[#dc2626]" : "text-[#a3a3a3]"}`}>
                {notesCodePointCount}/{NOTES_MAX_CODE_POINTS}
              </span>
            </FieldLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={textareaClass} />
            {notesTooLong && (
              <span className="text-sm text-[#dc2626]">Notes must be at most {NOTES_MAX_CODE_POINTS} characters.</span>
            )}
          </label>

          <button type="button" onClick={handleAddClimb} disabled={!currentIsValid} className={`${secondaryButton} justify-center`}>
            + Add climb
          </button>
        </section>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] pt-5">
          <button type="button" onClick={handleCancel} disabled={submitting} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={!canSave} className={`${primaryButton} px-5`}>
            {submitting ? "Saving…" : pendingEntries > 0 ? `Save session · ${plural(pendingEntries, "climb")}` : "Save session"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
