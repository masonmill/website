// ─── Types ────────────────────────────────────────────────────────────────

export const BOARDS = ["MoonBoard 2019", "MoonBoard 2024"] as const;
export type Board = (typeof BOARDS)[number];

export const BOARD_SHORT_NAMES: Record<Board, string> = {
  "MoonBoard 2019": "MB 2019",
  "MoonBoard 2024": "MB 2024",
};

export const GRADES = ["6a+/V3", "6b/V4", "6c/V5", "7a/V6", "7a+/V7"] as const;
export type Grade = (typeof GRADES)[number];

export const LOCATIONS = ["Planet Rock Ann Arbor", "Movement Long Island City"] as const;
export type Location = (typeof LOCATIONS)[number];

export interface Session {
  id: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
  location: Location;
  notes?: string;
}

/** Maximum number of Unicode code points allowed in a session's notes. */
export const NOTES_MAX_CODE_POINTS = 280;

export interface Climb {
  id: number;
  name: string;
  board: Board;
  grade: Grade;
  nextSessionID: number;
  sessions: Session[];
}

export interface Log {
  nextClimbID: number;
  climbs: Climb[];
}

export type SessionInput = Omit<Session, "id">;

/** SessionInput before location has been validated against the closed enum. */
export type SessionWriteInput = Omit<SessionInput, "location"> & { location: string };

export type ClimbingLogError =
  | { type: "validation"; field: string; message: string }
  | { type: "not-found"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: ClimbingLogError };

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err<T>(error: ClimbingLogError): Result<T> {
  return { ok: false, error };
}

function validationError(field: string, message: string): ClimbingLogError {
  return { type: "validation", field, message };
}

function notFoundError(message: string): ClimbingLogError {
  return { type: "not-found", message };
}

export type SendLabel = "Flash" | "Day flash" | "Repeat" | "Sent" | "Project";

// ─── Code-point ordering ────────────────────────────────────────────────
//
// JS's default string comparison operators (`<`, `>`, `.sort()` without a
// comparator) compare UTF-16 code units, which disagrees with true code
// point order for astral characters (surrogate pairs). We compare by
// iterating code points explicitly so climb ordering matches the C++
// `std::string` (byte-wise, i.e. code-point-equivalent for UTF-8) sort.

export function compareByCodePoint(a: string, b: string): number {
  const aCodePoints = Array.from(a, (c) => c.codePointAt(0)!);
  const bCodePoints = Array.from(b, (c) => c.codePointAt(0)!);
  const len = Math.min(aCodePoints.length, bCodePoints.length);
  for (let i = 0; i < len; i++) {
    if (aCodePoints[i] !== bCodePoints[i]) return aCodePoints[i] - bCodePoints[i];
  }
  return aCodePoints.length - bCodePoints.length;
}

function sortClimbsByName(climbs: Climb[]): Climb[] {
  return [...climbs].sort((a, b) => compareByCodePoint(a.name, b.name));
}

function sortSessionsByTimestamp(sessions: Session[]): Session[] {
  return [...sessions]
    .map((session, index) => ({ session, index }))
    .sort((a, b) => a.session.timestamp - b.session.timestamp || a.index - b.index)
    .map(({ session }) => session);
}

// ─── Validation ──────────────────────────────────────────────────────────

function validateName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return err(validationError("name", "Name must not be empty."));
  }
  if (trimmed.length > 255) {
    return err(validationError("name", "Name must be at most 255 characters."));
  }
  return ok(trimmed);
}

function validateBoard(board: string): Result<Board> {
  if (!(BOARDS as readonly string[]).includes(board)) {
    return err(validationError("board", `Unknown board: ${board}`));
  }
  return ok(board as Board);
}

function validateGrade(grade: string): Result<Grade> {
  if (!(GRADES as readonly string[]).includes(grade)) {
    return err(validationError("grade", `Unknown grade: ${grade}`));
  }
  return ok(grade as Grade);
}

function validateLocation(location: string): Result<Location> {
  if (!(LOCATIONS as readonly string[]).includes(location)) {
    return err(validationError("location", `Unknown location: ${location}`));
  }
  return ok(location as Location);
}

function validateTimestamp(timestamp: number): Result<number> {
  if (!Number.isInteger(timestamp)) {
    return err(validationError("timestamp", "Timestamp must be an integer."));
  }
  return ok(timestamp);
}

function validateAttempts(attempts: number): Result<number> {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 999) {
    return err(validationError("attempts", "Attempts must be an integer between 1 and 999."));
  }
  return ok(attempts);
}

function validateIncline(incline: number): Result<number> {
  if (!Number.isInteger(incline) || incline < 0 || incline > 70) {
    return err(validationError("incline", "Incline must be an integer between 0 and 70."));
  }
  return ok(incline);
}

function validateNotes(notes: string | undefined): Result<string | undefined> {
  if (notes === undefined) return ok(undefined);
  const trimmed = notes.trim();
  if (trimmed.length === 0) return ok(undefined);
  const codePointCount = Array.from(trimmed).length;
  if (codePointCount > NOTES_MAX_CODE_POINTS) {
    return err(validationError("notes", `Notes must be at most ${NOTES_MAX_CODE_POINTS} characters.`));
  }
  return ok(trimmed);
}

function validateSessionInput(input: SessionWriteInput): Result<SessionInput> {
  const timestampResult = validateTimestamp(input.timestamp);
  if (!timestampResult.ok) return timestampResult;
  const attemptsResult = validateAttempts(input.attempts);
  if (!attemptsResult.ok) return attemptsResult;
  const inclineResult = validateIncline(input.incline);
  if (!inclineResult.ok) return inclineResult;
  const locationResult = validateLocation(input.location);
  if (!locationResult.ok) return locationResult;
  const notesResult = validateNotes(input.notes);
  if (!notesResult.ok) return notesResult;
  return ok({
    timestamp: timestampResult.value,
    attempts: attemptsResult.value,
    incline: inclineResult.value,
    sent: input.sent,
    location: locationResult.value,
    ...(notesResult.value !== undefined ? { notes: notesResult.value } : {}),
  });
}

// ─── Lookups ─────────────────────────────────────────────────────────────

function findClimbIndex(log: Log, climbId: number): number {
  return log.climbs.findIndex((c) => c.id === climbId);
}

function findSessionIndex(climb: Climb, sessionId: number): number {
  return climb.sessions.findIndex((s) => s.id === sessionId);
}

// ─── Parsing ─────────────────────────────────────────────────────────────

function parseSession(json: unknown, context: string): Result<Session> {
  if (typeof json !== "object" || json === null) {
    return err(validationError("sessions", `${context}: session must be an object.`));
  }
  const j = json as Record<string, unknown>;
  if (typeof j.id !== "number") {
    return err(validationError("id", `${context}: missing or invalid session id.`));
  }
  if (typeof j.timestamp !== "number") {
    return err(validationError("timestamp", `${context}: missing or invalid timestamp.`));
  }
  if (typeof j.attempts !== "number") {
    return err(validationError("attempts", `${context}: missing or invalid attempts.`));
  }
  if (typeof j.incline !== "number") {
    return err(validationError("incline", `${context}: missing or invalid incline.`));
  }
  if (typeof j.sent !== "boolean") {
    return err(validationError("sent", `${context}: missing or invalid sent.`));
  }
  if (typeof j.location !== "string") {
    return err(validationError("location", `${context}: missing or invalid location.`));
  }
  const locationResult = validateLocation(j.location);
  if (!locationResult.ok) return locationResult;
  if (j.notes !== undefined && typeof j.notes !== "string") {
    return err(validationError("notes", `${context}: invalid notes.`));
  }
  return ok({
    id: j.id,
    timestamp: j.timestamp,
    attempts: j.attempts,
    incline: j.incline,
    sent: j.sent,
    location: locationResult.value,
    ...(typeof j.notes === "string" ? { notes: j.notes } : {}),
  });
}

function parseClimb(json: unknown): Result<Climb> {
  if (typeof json !== "object" || json === null) {
    return err(validationError("climbs", "Climb must be an object."));
  }
  const j = json as Record<string, unknown>;
  if (typeof j.id !== "number") {
    return err(validationError("id", "Missing or invalid climb id."));
  }
  if (typeof j.name !== "string") {
    return err(validationError("name", "Missing or invalid climb name."));
  }
  if (typeof j.board !== "string") {
    return err(validationError("board", "Missing or invalid board."));
  }
  const boardResult = validateBoard(j.board);
  if (!boardResult.ok) return boardResult;
  if (typeof j.grade !== "string") {
    return err(validationError("grade", "Missing or invalid grade."));
  }
  const gradeResult = validateGrade(j.grade);
  if (!gradeResult.ok) return gradeResult;
  if (typeof j.nextSessionID !== "number") {
    return err(validationError("nextSessionID", "Missing or invalid nextSessionID."));
  }
  if (!Array.isArray(j.sessions)) {
    return err(validationError("sessions", "Missing or invalid sessions array."));
  }
  const sessions: Session[] = [];
  for (const sessionJson of j.sessions) {
    const sessionResult = parseSession(sessionJson, `climb "${j.name}"`);
    if (!sessionResult.ok) return sessionResult;
    sessions.push(sessionResult.value);
  }
  if (sessions.length === 0) {
    return err(validationError("sessions", `Climb "${j.name}" has no sessions.`));
  }
  return ok({
    id: j.id,
    name: j.name,
    board: boardResult.value,
    grade: gradeResult.value,
    nextSessionID: j.nextSessionID,
    sessions: sortSessionsByTimestamp(sessions),
  });
}

/** Parses a log.json string into a typed Log, sorted per the contract. */
export function parseLog(text: string): Result<Log> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return err(validationError("json", `Invalid JSON: ${(e as Error).message}`));
  }
  if (typeof json !== "object" || json === null) {
    return err(validationError("json", "Log must be an object."));
  }
  const j = json as Record<string, unknown>;
  if (typeof j.nextClimbID !== "number") {
    return err(validationError("nextClimbID", "Missing or invalid nextClimbID."));
  }
  if (!Array.isArray(j.climbs)) {
    return err(validationError("climbs", "Missing or invalid climbs array."));
  }
  const climbs: Climb[] = [];
  for (const climbJson of j.climbs) {
    const climbResult = parseClimb(climbJson);
    if (!climbResult.ok) return climbResult;
    climbs.push(climbResult.value);
  }
  return ok({
    nextClimbID: j.nextClimbID,
    climbs: sortClimbsByName(climbs),
  });
}

// ─── Serialization ───────────────────────────────────────────────────────

function sessionToJson(session: Session) {
  return {
    id: session.id,
    timestamp: session.timestamp,
    attempts: session.attempts,
    incline: session.incline,
    sent: session.sent,
    location: session.location,
    ...(session.notes !== undefined ? { notes: session.notes } : {}),
  };
}

function climbToJson(climb: Climb) {
  return {
    id: climb.id,
    name: climb.name,
    board: climb.board,
    grade: climb.grade,
    nextSessionID: climb.nextSessionID,
    sessions: climb.sessions.map(sessionToJson),
  };
}

/** Serializes a Log back to the exact log.json contract format. */
export function serializeLog(log: Log): string {
  const json = {
    nextClimbID: log.nextClimbID,
    climbs: log.climbs.map(climbToJson),
  };
  return JSON.stringify(json, null, 2) + "\n";
}

// ─── Operations ──────────────────────────────────────────────────────────

export interface OperationSuccess {
  log: Log;
  commitMessage: string;
  climbId: number;
  sessionId?: number;
}

/**
 * Logs a session under the given name/board/grade. If a climb with the
 * exact trimmed name and board already exists, the session is added to it
 * (its grade is left unchanged). Otherwise a new climb is created first.
 */
export function logSession(
  log: Log,
  input: {
    name: string;
    board: string;
    grade: string;
    timestamp: number;
    attempts: number;
    incline: number;
    sent: boolean;
    location: string;
    notes?: string;
  },
): Result<OperationSuccess> {
  const nameResult = validateName(input.name);
  if (!nameResult.ok) return nameResult;
  const name = nameResult.value;

  const sessionInputResult = validateSessionInput(input);
  if (!sessionInputResult.ok) return sessionInputResult;

  const existingClimb = log.climbs.find((c) => c.name === name && c.board === input.board);

  let workingLog = log;
  let climbId: number;

  if (existingClimb) {
    climbId = existingClimb.id;
  } else {
    const boardResult = validateBoard(input.board);
    if (!boardResult.ok) return boardResult;
    const gradeResult = validateGrade(input.grade);
    if (!gradeResult.ok) return gradeResult;

    climbId = workingLog.nextClimbID;
    const newClimb: Climb = {
      id: climbId,
      name,
      board: boardResult.value,
      grade: gradeResult.value,
      nextSessionID: 0,
      sessions: [],
    };
    workingLog = {
      nextClimbID: workingLog.nextClimbID + 1,
      climbs: sortClimbsByName([...workingLog.climbs, newClimb]),
    };
  }

  const addResult = addSession(workingLog, climbId, sessionInputResult.value);
  if (!addResult.ok) return addResult;

  return ok({
    ...addResult.value,
    commitMessage: `Log session: ${name}`,
  });
}

/** Adds a session to the given climb. */
export function addSession(log: Log, climbId: number, input: SessionWriteInput): Result<OperationSuccess> {
  const inputResult = validateSessionInput(input);
  if (!inputResult.ok) return inputResult;

  const climbIndex = findClimbIndex(log, climbId);
  if (climbIndex === -1) {
    return err(notFoundError(`Climb with id ${climbId} not found.`));
  }
  const climb = log.climbs[climbIndex];
  const sessionId = climb.nextSessionID;
  const newSession: Session = { id: sessionId, ...inputResult.value };
  const updatedClimb: Climb = {
    ...climb,
    nextSessionID: climb.nextSessionID + 1,
    sessions: sortSessionsByTimestamp([...climb.sessions, newSession]),
  };
  const climbs = [...log.climbs];
  climbs[climbIndex] = updatedClimb;

  return ok({
    log: { ...log, climbs },
    commitMessage: `Log session: ${climb.name}`,
    climbId: climb.id,
    sessionId,
  });
}

/** Replaces timestamp/attempts/incline/sent for an existing session. Its ID is unchanged. */
export function editSession(log: Log, climbId: number, sessionId: number, input: SessionWriteInput): Result<OperationSuccess> {
  const inputResult = validateSessionInput(input);
  if (!inputResult.ok) return inputResult;

  const climbIndex = findClimbIndex(log, climbId);
  if (climbIndex === -1) {
    return err(notFoundError(`Climb with id ${climbId} not found.`));
  }
  const climb = log.climbs[climbIndex];
  const sessionIndex = findSessionIndex(climb, sessionId);
  if (sessionIndex === -1) {
    return err(notFoundError(`Session with id ${sessionId} not found on climb ${climbId}.`));
  }
  const updatedSession: Session = { id: sessionId, ...inputResult.value };
  const sessions = [...climb.sessions];
  sessions[sessionIndex] = updatedSession;
  const updatedClimb: Climb = { ...climb, sessions: sortSessionsByTimestamp(sessions) };
  const climbs = [...log.climbs];
  climbs[climbIndex] = updatedClimb;

  return ok({
    log: { ...log, climbs },
    commitMessage: `Edit session: ${climb.name}`,
    climbId: climb.id,
    sessionId,
  });
}

/** Deletes a session. The owning climb's nextSessionID is left unchanged. */
export function deleteSession(log: Log, climbId: number, sessionId: number): Result<OperationSuccess> {
  const climbIndex = findClimbIndex(log, climbId);
  if (climbIndex === -1) {
    return err(notFoundError(`Climb with id ${climbId} not found.`));
  }
  const climb = log.climbs[climbIndex];
  const sessionIndex = findSessionIndex(climb, sessionId);
  if (sessionIndex === -1) {
    return err(notFoundError(`Session with id ${sessionId} not found on climb ${climbId}.`));
  }
  const sessions = climb.sessions.filter((s) => s.id !== sessionId);

  const climbs =
    sessions.length === 0
      ? log.climbs.filter((_, i) => i !== climbIndex)
      : (() => {
          const updated = [...log.climbs];
          updated[climbIndex] = { ...climb, sessions };
          return updated;
        })();

  return ok({
    log: { ...log, climbs },
    commitMessage: `Delete session: ${climb.name}`,
    climbId: climb.id,
  });
}

/** Replaces name/board/grade for an existing climb. Name is trimmed. */
export function editClimb(
  log: Log,
  climbId: number,
  input: { name: string; board: string; grade: string },
): Result<OperationSuccess> {
  const nameResult = validateName(input.name);
  if (!nameResult.ok) return nameResult;
  const boardResult = validateBoard(input.board);
  if (!boardResult.ok) return boardResult;
  const gradeResult = validateGrade(input.grade);
  if (!gradeResult.ok) return gradeResult;

  const climbIndex = findClimbIndex(log, climbId);
  if (climbIndex === -1) {
    return err(notFoundError(`Climb with id ${climbId} not found.`));
  }
  const climb = log.climbs[climbIndex];
  const updatedClimb: Climb = {
    ...climb,
    name: nameResult.value,
    board: boardResult.value,
    grade: gradeResult.value,
  };
  const climbs = sortClimbsByName([...log.climbs.filter((_, i) => i !== climbIndex), updatedClimb]);

  return ok({
    log: { ...log, climbs },
    commitMessage: `Edit climb: ${nameResult.value}`,
    climbId: climb.id,
  });
}

// ─── Session labels ──────────────────────────────────────────────────────

/**
 * Computes the send label for a session given its position within its
 * climb's chronologically-sorted sessions.
 */
export function computeSessionLabel(params: {
  sent: boolean;
  attempts: number;
  sessionIndex: number;
  priorSentInClimb: boolean;
}): SendLabel {
  const { sent, attempts, sessionIndex, priorSentInClimb } = params;
  if (!sent) return "Project";
  if (priorSentInClimb) return "Repeat";
  if (attempts === 1 && sessionIndex === 0) return "Flash";
  if (attempts === 1) return "Day flash";
  return "Sent";
}
