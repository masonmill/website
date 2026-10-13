"use client";

import { useMemo, useState } from "react";
import { LOCATIONS, NOTES_MAX_CODE_POINTS, type Location } from "@/lib/climbingLog/climbingLog";
import { computeEditedSessionTimestamp, toDateInputValue } from "@/lib/climbingLog/timestamp";
import { errorMessage, isNotFound } from "./actionErrors";
import { editSessionAction } from "./actions";
import { Chip, Dialog, ErrorText, FieldLabel, inputClass, primaryButton, secondaryButton, textareaClass } from "./ui";

/** Identifies an existing session being edited. */
export interface EditSessionFormSession {
  climbId: number;
  sessionId: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
  location: Location;
  notes?: string;
}

export interface EditSessionFormProps {
  session: EditSessionFormSession;
  onCancel: () => void;
  /** Called after a successful save so the caller can refresh data and close the form. */
  onSuccess: () => void;
  /**
   * Called when the save fails because the target session no longer exists.
   * The caller should reload the latest data and close the form.
   */
  onNotFound: () => void;
}

/** Edits one existing session's date, attempts, incline, result, location and notes. */
export function EditSessionForm({ session, onCancel, onSuccess, onNotFound }: EditSessionFormProps) {
  const [date, setDate] = useState(() => toDateInputValue(new Date(session.timestamp * 1000)));
  const [attempts, setAttempts] = useState<number | "">(session.attempts);
  const [incline, setIncline] = useState(session.incline);
  const [sent, setSent] = useState(session.sent);
  const [location, setLocation] = useState<Location>(session.location);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesCodePointCount = useMemo(() => Array.from(notes.trim()).length, [notes]);
  const notesTooLong = notesCodePointCount > NOTES_MAX_CODE_POINTS;
  const canSubmit = attempts !== "" && !submitting && !notesTooLong;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await editSessionAction({
      climbId: session.climbId,
      sessionId: session.sessionId,
      timestamp: computeEditedSessionTimestamp(session.timestamp, date),
      attempts,
      incline,
      sent,
      location,
      notes,
    });

    setSubmitting(false);

    if (!result.ok) {
      if (isNotFound(result)) {
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
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Edit session</h2>

        <section className="flex flex-col gap-3.5">
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
              className={`${inputClass} px-2.5`}
            >
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
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
