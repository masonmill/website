import type { Session } from "./climbingLog";

// ─── Detail-page pure helpers ──────────────────────────────────────────────
//
// Pulled out of the climb detail page/component so the counting and
// row-ordering logic can be unit tested without rendering React.

/** Number of sessions on a climb where `sent === true` (iOS: ClimbDetailView's `sentCount`). */
export function computeSendsCount(sessions: Session[]): number {
  return sessions.filter((s) => s.sent).length;
}

export interface ClimbDetailSessionRow {
  sessionId: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

/**
 * Orders a climb's sessions newest-first for the detail page (the opposite
 * of the chronological-ascending order sessions are stored/sorted in).
 */
export function buildClimbDetailRows(sessions: Session[]): ClimbDetailSessionRow[] {
  return [...sessions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((s) => ({
      sessionId: s.id,
      timestamp: s.timestamp,
      attempts: s.attempts,
      incline: s.incline,
      sent: s.sent,
    }));
}
