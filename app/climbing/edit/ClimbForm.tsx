"use client";

import { useState } from "react";
import { BOARDS, GRADES, type Board, type Grade } from "@/lib/climbingLog/climbingLog";
import { editClimbAction, type ActionResult } from "./actions";
import type { OperationSuccess } from "@/lib/climbingLog/climbingLog";

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

function errorMessage(result: Extract<ActionResult<OperationSuccess>, { ok: false }>): string {
  if (result.kind === "unauthorized") {
    return result.status === 401
      ? "You need to sign in again to make changes."
      : "This account doesn't have access to edit the log.";
  }
  return result.error.message;
}

function isNotFound(result: Extract<ActionResult<OperationSuccess>, { ok: false }>): boolean {
  return result.kind === "storage" && result.error.type === "not-found";
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full flex-col gap-6 overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-neutral-900"
      >
        <h2 className="text-lg font-semibold">Edit Climb</h2>

        <section className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Board</span>
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value as Board)}
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
              onChange={(e) => setGrade(e.target.value as Grade)}
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
