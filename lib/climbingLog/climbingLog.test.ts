import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseLog,
  serializeLog,
  logSession,
  addSession,
  editSession,
  deleteSession,
  editClimb,
  computeSessionLabel,
  compareByCodePoint,
  type Log,
} from "./climbingLog";

const fixturePath = path.join(__dirname, "__fixtures__", "log.fixture.json");
const fixtureText = fs.readFileSync(fixturePath, "utf8");

function mustParse(text: string): Log {
  const result = parseLog(text);
  assert.equal(result.ok, true, "expected parse to succeed");
  if (!result.ok) throw new Error("unreachable");
  return result.value;
}

// ─── Round trip ──────────────────────────────────────────────────────────

test("parsing and serializing the fixture reproduces it byte for byte", () => {
  const log = mustParse(fixtureText);
  const serialized = serializeLog(log);
  assert.equal(serialized, fixtureText);
});

// ─── Log session ─────────────────────────────────────────────────────────

test("logging a session under a new name creates a new climb", () => {
  const log = mustParse(fixtureText);
  const nextClimbID = log.nextClimbID;
  const result = logSession(log, {
    name: "Brand New Problem",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1000,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.climbId, nextClimbID);
  assert.equal(result.value.log.nextClimbID, nextClimbID + 1);
  const climb = result.value.log.climbs.find((c) => c.id === nextClimbID);
  assert.ok(climb);
  assert.equal(climb!.nextSessionID, 1);
  assert.equal(climb!.sessions.length, 1);
  assert.equal(climb!.sessions[0].id, 0);
  assert.equal(result.value.commitMessage, "Log session: Brand New Problem");
});

test("logging under an existing exact name+board adds a session and keeps grade", () => {
  const log = mustParse(fixtureText);
  const existing = log.climbs.find((c) => c.name === "Entry")!;
  const result = logSession(log, {
    name: "Entry",
    board: existing.board,
    grade: "7a+/V7", // should be ignored since climb exists
    timestamp: 999999,
    attempts: 3,
    incline: 25,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.log.nextClimbID, log.nextClimbID);
  const climb = result.value.log.climbs.find((c) => c.id === existing.id)!;
  assert.equal(climb.grade, existing.grade);
  assert.equal(climb.sessions.length, existing.sessions.length + 1);
});

test("logging with a different board creates a separate climb", () => {
  const log = mustParse(fixtureText);
  const existing = log.climbs.find((c) => c.name === "Entry")!;
  const otherBoard = existing.board === "MoonBoard 2019" ? "MoonBoard 2024" : "MoonBoard 2019";
  const result = logSession(log, {
    name: "Entry",
    board: otherBoard,
    grade: "6a+/V3",
    timestamp: 1000,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.log.climbs.length, log.climbs.length + 1);
});

test("logging with different letter case creates a separate climb", () => {
  const log = mustParse(fixtureText);
  const existing = log.climbs.find((c) => c.name === "Entry")!;
  const result = logSession(log, {
    name: "entry",
    board: existing.board,
    grade: "6a+/V3",
    timestamp: 1000,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.log.climbs.length, log.climbs.length + 1);
});

// ─── Delete session ──────────────────────────────────────────────────────

test("deleting a session leaves nextSessionID unchanged", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs.find((c) => c.sessions.length >= 2)!;
  const sessionToDelete = climb.sessions[0];
  const prevNextSessionID = climb.nextSessionID;

  const delResult = deleteSession(log, climb.id, sessionToDelete.id);
  assert.equal(delResult.ok, true);
  if (!delResult.ok) return;
  const afterDeleteClimb = delResult.value.log.climbs.find((c) => c.id === climb.id)!;
  assert.equal(afterDeleteClimb.nextSessionID, prevNextSessionID);
  assert.equal(
    afterDeleteClimb.sessions.find((s) => s.id === sessionToDelete.id),
    undefined,
  );

  const addResult = addSession(delResult.value.log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(addResult.ok, true);
  if (!addResult.ok) return;
  assert.equal(addResult.value.sessionId, prevNextSessionID);
});

test("deleting a climb's only session removes the climb entirely", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs.find((c) => c.sessions.length === 1)!;

  const result = deleteSession(log, climb.id, climb.sessions[0].id);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    result.value.log.climbs.find((c) => c.id === climb.id),
    undefined,
  );
  assert.equal(result.value.log.climbs.length, log.climbs.length - 1);
});

test("deleting a non-last session leaves the climb with its remaining sessions", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs.find((c) => c.sessions.length >= 2)!;
  const sessionToDelete = climb.sessions[0];

  const result = deleteSession(log, climb.id, sessionToDelete.id);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const afterDeleteClimb = result.value.log.climbs.find((c) => c.id === climb.id)!;
  assert.equal(afterDeleteClimb.sessions.length, climb.sessions.length - 1);
});

test("parsing a climb with an empty sessions array throws a ClimbingLogError", () => {
  const log = JSON.parse(fixtureText);
  log.climbs[0].sessions = [];
  const result = parseLog(JSON.stringify(log));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.type, "validation");
});

// ─── Edit session / climb ────────────────────────────────────────────────

test("editing a session keeps its ID and re-sorts sessions by timestamp", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs.find((c) => c.name === "Arthritis")!;
  const sessionToEdit = climb.sessions[0];
  const result = editSession(log, climb.id, sessionToEdit.id, {
    timestamp: climb.sessions[climb.sessions.length - 1].timestamp + 1,
    attempts: 5,
    incline: 40,
    sent: true,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const updatedClimb = result.value.log.climbs.find((c) => c.id === climb.id)!;
  const editedSession = updatedClimb.sessions.find((s) => s.id === sessionToEdit.id)!;
  assert.equal(editedSession.attempts, 5);
  assert.equal(updatedClimb.sessions[updatedClimb.sessions.length - 1].id, sessionToEdit.id);
  for (let i = 1; i < updatedClimb.sessions.length; i++) {
    assert.ok(updatedClimb.sessions[i - 1].timestamp <= updatedClimb.sessions[i].timestamp);
  }
});

test("editing a climb re-sorts the climbs list", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs.find((c) => c.name === "A Wok to Remember")!;
  const result = editClimb(log, climb.id, {
    name: "Zzz Last Climb",
    board: climb.board,
    grade: climb.grade,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const { climbs } = result.value.log;
  const idx = climbs.findIndex((c) => c.id === climb.id);
  assert.equal(climbs[idx].name, "Zzz Last Climb");
  for (let i = 1; i < climbs.length; i++) {
    assert.ok(compareByCodePoint(climbs[i - 1].name, climbs[i].name) <= 0);
  }
  assert.equal(result.value.commitMessage, "Edit climb: Zzz Last Climb");
});

// ─── Validation errors ───────────────────────────────────────────────────

test("empty name produces a validation error naming the field", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "   ",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.type, "validation");
  assert.equal(result.error.field, "name");
});

test("name over 255 chars produces a validation error", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "a".repeat(256),
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "name");
});

test("attempts of 0 produces a validation error", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 0,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "attempts");
});

test("attempts of 1000 produces a validation error", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1000,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "attempts");
});

test("incline of -1 produces a validation error", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: -1,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "incline");
});

test("incline of 71 produces a validation error", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: 71,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "incline");
});

test("incline of 40.5 produces a validation error", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: 40.5,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "incline");
});

test("unknown board produces a validation error naming the field", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 3000" as never,
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "board");
});

test("unknown grade produces a validation error naming the field", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "9z/V99" as never,
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "grade");
});

test("unknown location produces a validation error naming the field", () => {
  const log = mustParse(fixtureText);
  const result = logSession(log, {
    name: "Whatever",
    board: "MoonBoard 2019",
    grade: "6a+/V3",
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Some Other Gym",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.field, "location");
});

test("a session missing location fails to parse with a ClimbingLogError", () => {
  const log = JSON.parse(fixtureText);
  delete log.climbs[0].sessions[0].location;
  const result = parseLog(JSON.stringify(log));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.type, "validation");
  assert.equal(result.error.field, "location");
});

test("parsing a serialized session round-trips location exactly", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const result = addSession(log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Movement Long Island City",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const reparsed = mustParse(serializeLog(result.value.log));
  const updatedClimb = reparsed.climbs.find((c) => c.id === climb.id)!;
  const newSession = updatedClimb.sessions.find((s) => s.id === result.value.sessionId)!;
  assert.equal(newSession.location, "Movement Long Island City");
});

// ─── Not-found errors ────────────────────────────────────────────────────

test("unknown climb ID produces a not-found error", () => {
  const log = mustParse(fixtureText);
  const result = addSession(log, 999999, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.type, "not-found");
});

test("unknown session ID produces a not-found error", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const result = editSession(log, climb.id, 999999, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.type, "not-found");
});

// ─── Notes ───────────────────────────────────────────────────────────────

test("a session with notes serializes with notes as the last key", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const result = addSession(log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
    notes: "Felt good today.",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const serialized = serializeLog(result.value.log);
  const sessionIdPattern = `"id": ${result.value.sessionId}`;
  const sessionSnippetMatch = serialized.match(
    new RegExp(`\\{\\s*${sessionIdPattern},\\s*"timestamp": 1,[\\s\\S]*?"notes": "Felt good today\\."\\s*\\}`)
  );
  assert.ok(sessionSnippetMatch, "expected session object with notes as last key");
  const keys = Object.keys(JSON.parse(sessionSnippetMatch![0]));
  assert.deepEqual(keys, ["id", "timestamp", "attempts", "incline", "sent", "location", "notes"]);
});

test("whitespace-only notes are omitted from the session entirely", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const result = addSession(log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
    notes: "   ",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const updatedClimb = result.value.log.climbs.find((c) => c.id === climb.id)!;
  const newSession = updatedClimb.sessions.find((s) => s.id === result.value.sessionId)!;
  assert.equal("notes" in newSession, false);
});

test("notes of exactly 280 code points is accepted", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const notes = "😀".repeat(280);
  assert.equal(Array.from(notes).length, 280);
  const result = addSession(log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
    notes,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const updatedClimb = result.value.log.climbs.find((c) => c.id === climb.id)!;
  const newSession = updatedClimb.sessions.find((s) => s.id === result.value.sessionId)!;
  assert.equal(newSession.notes, notes);
});

test("notes of 281 code points is rejected with a validation error naming notes", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const notes = "😀".repeat(281);
  assert.equal(Array.from(notes).length, 281);
  const result = addSession(log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
    notes,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.type, "validation");
  assert.equal(result.error.field, "notes");
});

test("editing a session to clear existing notes removes the notes key", () => {
  const log = mustParse(fixtureText);
  const climb = log.climbs[0];
  const addResult = addSession(log, climb.id, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
    notes: "Original notes.",
  });
  assert.equal(addResult.ok, true);
  if (!addResult.ok) return;

  const editResult = editSession(addResult.value.log, climb.id, addResult.value.sessionId!, {
    timestamp: 1,
    attempts: 1,
    incline: 40,
    sent: false,
    location: "Planet Rock Ann Arbor",
    notes: "   ",
  });
  assert.equal(editResult.ok, true);
  if (!editResult.ok) return;
  const updatedClimb = editResult.value.log.climbs.find((c) => c.id === climb.id)!;
  const editedSession = updatedClimb.sessions.find((s) => s.id === addResult.value.sessionId)!;
  assert.equal("notes" in editedSession, false);
});

// ─── Session labels ──────────────────────────────────────────────────────

test("first session, 1 attempt, sent is a Flash", () => {
  assert.equal(computeSessionLabel({ sent: true, attempts: 1, sessionIndex: 0, priorSentInClimb: false }), "Flash");
});

test("later session, first send, 1 attempt is a Day flash", () => {
  assert.equal(computeSessionLabel({ sent: true, attempts: 1, sessionIndex: 2, priorSentInClimb: false }), "Day flash");
});

test("a send after an earlier send is a Repeat", () => {
  assert.equal(computeSessionLabel({ sent: true, attempts: 1, sessionIndex: 3, priorSentInClimb: true }), "Repeat");
});

test("an unsent session is a Project", () => {
  assert.equal(computeSessionLabel({ sent: false, attempts: 4, sessionIndex: 0, priorSentInClimb: false }), "Project");
});

test("sent with multiple attempts as first session is Sent", () => {
  assert.equal(computeSessionLabel({ sent: true, attempts: 3, sessionIndex: 0, priorSentInClimb: false }), "Sent");
});
