import {
  BOARD_SHORT_NAMES,
  computeSessionLabel,
  type Climb,
  type Log,
  type SendLabel,
} from "./climbingLog";

// ─── Types ────────────────────────────────────────────────────────────────

/** A single session flattened with its owning climb's display info. */
export interface EditorSessionRow {
  climbId: number;
  sessionId: number;
  name: string;
  board: string;
  boardShort: string;
  grade: string;
  timestamp: number;
  attempts: number;
  incline: number;
  label: SendLabel;
  notes?: string;
}

/** One calendar-day bucket of session rows, newest session first. */
export interface EditorDayGroup {
  /** Opaque key identifying the calendar day (e.g. from dayKeyFn). */
  dayKey: string;
  rows: EditorSessionRow[];
}

export interface EditorClimbSummary {
  climbId: number;
  name: string;
  grade: string;
  board: string;
  boardShort: string;
}

export interface EditorListData {
  dayGroups: EditorDayGroup[];
  climbsWithNoSessions: EditorClimbSummary[];
}

/**
 * Given an epoch-seconds timestamp, returns a string key identifying the
 * calendar day it falls in, in the caller's desired time zone semantics.
 * The default implementation uses UTC day boundaries; callers running in
 * the browser should pass a function that uses local Date fields instead
 * (see website's client-side grouping component).
 */
export type DayKeyFn = (timestampSeconds: number) => string;

export function utcDayKey(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

// ─── Attempt formatting ─────────────────────────────────────────────────

export function formatAttempts(attempts: number): string {
  return `${attempts} attempt${attempts === 1 ? "" : "s"}`;
}

// ─── Flatten + label ────────────────────────────────────────────────────

function flattenClimb(climb: Climb): EditorSessionRow[] {
  // Sessions are already sorted chronologically (oldest first) per the
  // climbingLog.ts contract.
  const sessions = climb.sessions;
  let priorSentInClimb = false;
  const rows: EditorSessionRow[] = sessions.map((session, index) => {
    const label = computeSessionLabel({
      sent: session.sent,
      attempts: session.attempts,
      sessionIndex: index,
      priorSentInClimb,
    });
    if (session.sent) priorSentInClimb = true;
    return {
      climbId: climb.id,
      sessionId: session.id,
      name: climb.name,
      board: climb.board,
      boardShort: BOARD_SHORT_NAMES[climb.board],
      grade: climb.grade,
      timestamp: session.timestamp,
      attempts: session.attempts,
      incline: session.incline,
      label,
      ...(session.notes !== undefined ? { notes: session.notes } : {}),
    };
  });
  return rows;
}

// ─── Grouping ───────────────────────────────────────────────────────────

/**
 * Builds the editor's main-list data: sessions from all climbs grouped by
 * calendar day (newest day first, newest session first within a day), and
 * a separate list of climbs with zero sessions.
 *
 * `dayKeyFn` determines which calendar day a timestamp belongs to; pass a
 * timezone-appropriate implementation (the browser's local time zone in
 * the actual UI, a fixed one in tests).
 */
export function buildEditorListData(log: Log, dayKeyFn: DayKeyFn = utcDayKey): EditorListData {
  const climbsWithNoSessions: EditorClimbSummary[] = [];
  const allRows: EditorSessionRow[] = [];

  for (const climb of log.climbs) {
    if (climb.sessions.length === 0) {
      climbsWithNoSessions.push({
        climbId: climb.id,
        name: climb.name,
        grade: climb.grade,
        board: climb.board,
        boardShort: BOARD_SHORT_NAMES[climb.board],
      });
      continue;
    }
    allRows.push(...flattenClimb(climb));
  }

  // Newest first overall; stable sort keeps deterministic tie-breaking.
  allRows.sort((a, b) => b.timestamp - a.timestamp);

  const dayGroups: EditorDayGroup[] = [];
  let currentKey: string | null = null;
  let currentRows: EditorSessionRow[] = [];

  for (const row of allRows) {
    const key = dayKeyFn(row.timestamp);
    if (key === currentKey) {
      currentRows.push(row);
    } else {
      if (currentKey !== null) {
        dayGroups.push({ dayKey: currentKey, rows: currentRows });
      }
      currentKey = key;
      currentRows = [row];
    }
  }
  if (currentKey !== null) {
    dayGroups.push({ dayKey: currentKey, rows: currentRows });
  }

  return { dayGroups, climbsWithNoSessions };
}
