"use client";

import { useState } from "react";
import { BOARDS, BOARD_SHORT_NAMES, GRADES, type Board, type Grade } from "@/lib/climbingLog/climbingLog";
import { errorMessage, isNotFound } from "./actionErrors";
import { editClimbAction } from "./actions";
import { BoardLogo, GRADE_COLORS } from "../styles";
import { Chip, Dialog, ErrorText, FieldLabel, inputClass, primaryButton, secondaryButton } from "./ui";

export interface ClimbFormClimb {
  id: number;
  name: string;
  board: Board;
  grade: Grade;
}

export interface ClimbFormProps {
  climb: ClimbFormClimb;
  onCancel: () => void;
  /** Called after a successful save so the caller can refresh data and close the form. */
  onSuccess: () => void;
  /**
   * Called when the save fails because the target climb no longer exists.
   * The caller should reload the latest data and close the form.
   */
  onNotFound?: () => void;
}

export function ClimbForm({ climb, onCancel, onSuccess, onNotFound }: ClimbFormProps) {
  const [name, setName] = useState(climb.name);
  const [board, setBoard] = useState<Board>(climb.board);
  const [grade, setGrade] = useState<Grade>(climb.grade);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await editClimbAction({ climbId: climb.id, name, board, grade });

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
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Edit climb</h2>

        <section className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Name</FieldLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>Board</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {BOARDS.map((b) => (
                <Chip key={b} active={board === b} onClick={() => setBoard(b)}>
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
                <Chip key={g} active={grade === g} onClick={() => setGrade(g)} className="mono px-2.5 text-xs">
                  <span className="size-1.5 rounded-full" style={{ background: GRADE_COLORS[g] }} />
                  {g}
                </Chip>
              ))}
            </div>
          </div>
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
