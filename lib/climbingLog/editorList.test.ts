import { test } from "vitest";
import assert from "node:assert/strict";
import { buildEditorListData, formatAttempts, type DayKeyFn } from "./editorList";
import type { Log } from "./climbingLog";

// Fixed day-key function independent of system timezone: buckets by a
// pretend "local" day using a fixed UTC offset, so tests don't depend on
// the machine's actual timezone.
const OFFSET_SECONDS = -5 * 3600; // pretend fixed UTC-5 zone
const fixedOffsetDayKey: DayKeyFn = (timestampSeconds) => {
  const shifted = timestampSeconds + OFFSET_SECONDS;
  const d = new Date(shifted * 1000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

function makeLog(): Log {
  return {
    nextClimbID: 3,
    climbs: [
      {
        id: 0,
        name: "Climb A",
        board: "MoonBoard 2019",
        grade: "6a+/V3",
        nextSessionID: 2,
        sessions: [
          { id: 0, timestamp: 1000000, attempts: 3, incline: 40, sent: false, location: "Planet Rock Ann Arbor" },
          { id: 1, timestamp: 1000100, attempts: 1, incline: 40, sent: true, location: "Planet Rock Ann Arbor" },
        ],
      },
      {
        id: 1,
        name: "Climb B",
        board: "MoonBoard 2024",
        grade: "6b/V4",
        nextSessionID: 1,
        sessions: [
          { id: 0, timestamp: 1086500, attempts: 2, incline: 25, sent: true, location: "Movement Long Island City" },
        ],
      },
      {
        id: 2,
        name: "Climb C (no sessions)",
        board: "MoonBoard 2019",
        grade: "7a/V6",
        nextSessionID: 0,
        sessions: [],
      },
    ],
  };
}

test("buildEditorListData: groups newest day first, newest session first within a day", () => {
  const log = makeLog();
  const data = buildEditorListData(log, fixedOffsetDayKey);

  // Two distinct days: 1086500 (~ a day later than 1000000/1000100 which are the same day).
  assert.equal(data.dayGroups.length, 2);

  const [newestDay, olderDay] = data.dayGroups;

  // Newest day group contains only Climb B's session.
  assert.equal(newestDay.rows.length, 1);
  assert.equal(newestDay.rows[0].climbId, 1);

  // Older day group has both Climb A sessions, newest (timestamp 1000100) first.
  assert.equal(olderDay.rows.length, 2);
  assert.equal(olderDay.rows[0].sessionId, 1);
  assert.equal(olderDay.rows[0].timestamp, 1000100);
  assert.equal(olderDay.rows[1].sessionId, 0);
  assert.equal(olderDay.rows[1].timestamp, 1000000);
});

test("buildEditorListData: climbs with zero sessions go to climbsWithNoSessions, not day groups", () => {
  const log = makeLog();
  const data = buildEditorListData(log, fixedOffsetDayKey);

  assert.equal(data.climbsWithNoSessions.length, 1);
  assert.equal(data.climbsWithNoSessions[0].climbId, 2);
  assert.equal(data.climbsWithNoSessions[0].name, "Climb C (no sessions)");

  for (const group of data.dayGroups) {
    for (const row of group.rows) {
      assert.notEqual(row.climbId, 2);
    }
  }
});

test("formatAttempts: singular vs plural", () => {
  assert.equal(formatAttempts(1), "1 attempt");
  assert.equal(formatAttempts(2), "2 attempts");
  assert.equal(formatAttempts(0), "0 attempts");
});
