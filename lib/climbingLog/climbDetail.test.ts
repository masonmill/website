import { describe, expect, it } from "vitest";
import { buildClimbDetailRows, computeSendsCount } from "./climbDetail";
import type { Session } from "./climbingLog";

function makeSession(overrides: Partial<Session>): Session {
  return { id: 0, timestamp: 0, attempts: 1, incline: 40, sent: false, location: "Planet Rock Ann Arbor", ...overrides };
}

describe("computeSendsCount", () => {
  it("returns 0 for no sessions", () => {
    expect(computeSendsCount([])).toBe(0);
  });

  it("returns 0 when no sessions are sent", () => {
    const sessions = [makeSession({ id: 1 }), makeSession({ id: 2 })];
    expect(computeSendsCount(sessions)).toBe(0);
  });

  it("counts only sessions with sent === true", () => {
    const sessions = [
      makeSession({ id: 1, sent: true }),
      makeSession({ id: 2, sent: false }),
      makeSession({ id: 3, sent: true }),
    ];
    expect(computeSendsCount(sessions)).toBe(2);
  });
});

describe("buildClimbDetailRows", () => {
  it("orders sessions newest first", () => {
    const sessions = [
      makeSession({ id: 1, timestamp: 100 }),
      makeSession({ id: 2, timestamp: 300 }),
      makeSession({ id: 3, timestamp: 200 }),
    ];
    const rows = buildClimbDetailRows(sessions);
    expect(rows.map((r) => r.sessionId)).toEqual([2, 3, 1]);
  });

  it("maps fields through unchanged", () => {
    const sessions = [makeSession({ id: 1, timestamp: 100, attempts: 5, incline: 25, sent: true })];
    const rows = buildClimbDetailRows(sessions);
    expect(rows).toEqual([{ sessionId: 1, timestamp: 100, attempts: 5, incline: 25, sent: true }]);
  });
});
