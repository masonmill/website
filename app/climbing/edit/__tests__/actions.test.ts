import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const SECRET = "test-secret";
const OWNER_ID = 12345;
const OTHER_ID = 99999;

let cookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === SESSION_COOKIE_NAME ? { value: cookieValue } : undefined),
  }),
}));

vi.mock("@/lib/auth/config", () => ({
  getSessionSecret: () => SECRET,
  getOwnerGithubId: () => OWNER_ID,
}));

const applyLogOperationMock = vi.fn();

vi.mock("@/lib/climbingLog/githubStorage", () => ({
  applyLogOperation: (...args: unknown[]) => applyLogOperationMock(...args),
}));

describe("logSessionAction", () => {
  beforeEach(() => {
    cookieValue = undefined;
    applyLogOperationMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    name: "New Problem",
    board: "MoonBoard 2024",
    grade: "7a/V6",
    timestamp: 1_700_000_000,
    attempts: 1,
    incline: 40,
    sent: false,
  };

  it("returns 401 and calls no GitHub operation when there is no session", async () => {
    const { logSessionAction } = await import("../actions");
    const result = await logSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 401 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("returns 403 and calls no GitHub operation for a non-owner session", async () => {
    cookieValue = createSessionToken(OTHER_ID, SECRET);
    const { logSessionAction } = await import("../actions");
    const result = await logSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 403 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("calls applyLogOperation with an operation that logs the session for a valid owner session", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    const fakeSuccess = {
      log: { nextClimbID: 1, climbs: [] },
      commitMessage: "Log session: New Problem",
      climbId: 0,
      sessionId: 0,
    };
    applyLogOperationMock.mockResolvedValueOnce({ ok: true, value: fakeSuccess });

    const { logSessionAction } = await import("../actions");
    const result = await logSessionAction(validInput);

    expect(applyLogOperationMock).toHaveBeenCalledTimes(1);
    const operation = applyLogOperationMock.mock.calls[0][0] as (log: unknown) => unknown;
    const opResult = operation({ nextClimbID: 0, climbs: [] }) as {
      ok: boolean;
      value?: { commitMessage: string; climbId: number };
    };
    expect(opResult.ok).toBe(true);
    expect(opResult.value?.commitMessage).toBe("Log session: New Problem");

    expect(result).toEqual({ ok: true, value: fakeSuccess });
  });

  it("rejects invalid input (empty name) with a field-specific error and calls no GitHub operation", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    applyLogOperationMock.mockImplementationOnce(async (operation: (log: unknown) => unknown) => {
      // Simulate applyLogOperation's real behavior: apply the operation to
      // a log and surface a failed Result without ever reaching a PUT.
      return operation({ nextClimbID: 0, climbs: [] });
    });

    const { logSessionAction } = await import("../actions");
    const result = await logSessionAction({ ...validInput, name: "   " });

    expect(result).toEqual({
      ok: false,
      kind: "storage",
      error: { type: "validation", field: "name", message: "Name must not be empty." },
    });
  });
});

describe("addSessionAction", () => {
  beforeEach(() => {
    cookieValue = undefined;
    applyLogOperationMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    climbId: 3,
    timestamp: 1_700_000_000,
    attempts: 1,
    incline: 40,
    sent: false,
  };

  it("returns 401 and calls no GitHub operation when there is no session", async () => {
    const { addSessionAction } = await import("../actions");
    const result = await addSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 401 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("returns 403 and calls no GitHub operation for a non-owner session", async () => {
    cookieValue = createSessionToken(OTHER_ID, SECRET);
    const { addSessionAction } = await import("../actions");
    const result = await addSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 403 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("calls applyLogOperation with an operation that adds the session for a valid owner session", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    const fakeSuccess = {
      log: { nextClimbID: 1, climbs: [] },
      commitMessage: "Log session: Existing Problem",
      climbId: 3,
      sessionId: 0,
    };
    applyLogOperationMock.mockResolvedValueOnce({ ok: true, value: fakeSuccess });

    const { addSessionAction } = await import("../actions");
    const result = await addSessionAction(validInput);

    expect(applyLogOperationMock).toHaveBeenCalledTimes(1);
    const operation = applyLogOperationMock.mock.calls[0][0] as (log: unknown) => unknown;
    const opResult = operation({
      nextClimbID: 4,
      climbs: [
        {
          id: 3,
          name: "Existing Problem",
          board: "MoonBoard 2024",
          grade: "7a/V6",
          nextSessionID: 0,
          sessions: [],
        },
      ],
    }) as { ok: boolean; value?: { commitMessage: string; climbId: number } };
    expect(opResult.ok).toBe(true);
    expect(opResult.value?.commitMessage).toBe("Log session: Existing Problem");

    expect(result).toEqual({ ok: true, value: fakeSuccess });
  });

  it("rejects invalid input (attempts=0) with a field-specific error and calls no GitHub operation", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    applyLogOperationMock.mockImplementationOnce(async (operation: (log: unknown) => unknown) => {
      return operation({
        nextClimbID: 4,
        climbs: [
          {
            id: 3,
            name: "Existing Problem",
            board: "MoonBoard 2024",
            grade: "7a/V6",
            nextSessionID: 0,
            sessions: [],
          },
        ],
      });
    });

    const { addSessionAction } = await import("../actions");
    const result = await addSessionAction({ ...validInput, attempts: 0 });

    expect(result).toEqual({
      ok: false,
      kind: "storage",
      error: {
        type: "validation",
        field: "attempts",
        message: "Attempts must be an integer between 1 and 999.",
      },
    });
  });
});

describe("editSessionAction", () => {
  beforeEach(() => {
    cookieValue = undefined;
    applyLogOperationMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    climbId: 3,
    sessionId: 0,
    timestamp: 1_700_000_000,
    attempts: 5,
    incline: 45,
    sent: true,
  };

  const existingLog = {
    nextClimbID: 4,
    climbs: [
      {
        id: 3,
        name: "Existing Problem",
        board: "MoonBoard 2024",
        grade: "7a/V6",
        nextSessionID: 1,
        sessions: [{ id: 0, timestamp: 1_600_000_000, attempts: 1, incline: 40, sent: false }],
      },
    ],
  };

  it("returns 401 and calls no GitHub operation when there is no session", async () => {
    const { editSessionAction } = await import("../actions");
    const result = await editSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 401 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("returns 403 and calls no GitHub operation for a non-owner session", async () => {
    cookieValue = createSessionToken(OTHER_ID, SECRET);
    const { editSessionAction } = await import("../actions");
    const result = await editSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 403 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("calls applyLogOperation with an operation that edits the session, keeping its id and timestamp when unchanged, for a valid owner session", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    const fakeSuccess = {
      log: existingLog,
      commitMessage: "Edit session: Existing Problem",
      climbId: 3,
      sessionId: 0,
    };
    applyLogOperationMock.mockResolvedValueOnce({ ok: true, value: fakeSuccess });

    const { editSessionAction } = await import("../actions");
    const result = await editSessionAction(validInput);

    expect(applyLogOperationMock).toHaveBeenCalledTimes(1);
    const operation = applyLogOperationMock.mock.calls[0][0] as (log: unknown) => unknown;
    const opResult = operation(existingLog) as {
      ok: boolean;
      value?: { commitMessage: string; climbId: number; sessionId?: number; log: typeof existingLog };
    };
    expect(opResult.ok).toBe(true);
    expect(opResult.value?.commitMessage).toBe("Edit session: Existing Problem");
    expect(opResult.value?.sessionId).toBe(0);
    expect(opResult.value?.log.climbs[0].sessions[0].id).toBe(0);
    expect(opResult.value?.log.climbs[0].sessions[0].timestamp).toBe(validInput.timestamp);

    expect(result).toEqual({ ok: true, value: fakeSuccess });
  });

  it("rejects invalid input (incline=71) with a field-specific error and calls no GitHub operation", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    applyLogOperationMock.mockImplementationOnce(async (operation: (log: unknown) => unknown) => {
      return operation(existingLog);
    });

    const { editSessionAction } = await import("../actions");
    const result = await editSessionAction({ ...validInput, incline: 71 });

    expect(result).toEqual({
      ok: false,
      kind: "storage",
      error: {
        type: "validation",
        field: "incline",
        message: "Incline must be an integer between 0 and 70.",
      },
    });
  });

  it("surfaces a not-found storage error so the UI can trigger a reload", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    applyLogOperationMock.mockResolvedValueOnce({
      ok: false,
      error: { type: "not-found", message: "Session with id 0 not found on climb 3." },
    });

    const { editSessionAction } = await import("../actions");
    const result = await editSessionAction(validInput);

    expect(result).toEqual({
      ok: false,
      kind: "storage",
      error: { type: "not-found", message: "Session with id 0 not found on climb 3." },
    });
  });
});

describe("deleteSessionAction", () => {
  beforeEach(() => {
    cookieValue = undefined;
    applyLogOperationMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validInput = { climbId: 3, sessionId: 0 };

  const existingLog = {
    nextClimbID: 4,
    climbs: [
      {
        id: 3,
        name: "Existing Problem",
        board: "MoonBoard 2024",
        grade: "7a/V6",
        nextSessionID: 1,
        sessions: [{ id: 0, timestamp: 1_600_000_000, attempts: 1, incline: 40, sent: false }],
      },
    ],
  };

  it("returns 401 and calls no GitHub operation when there is no session", async () => {
    const { deleteSessionAction } = await import("../actions");
    const result = await deleteSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 401 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("returns 403 and calls no GitHub operation for a non-owner session", async () => {
    cookieValue = createSessionToken(OTHER_ID, SECRET);
    const { deleteSessionAction } = await import("../actions");
    const result = await deleteSessionAction(validInput);
    expect(result).toEqual({ ok: false, kind: "unauthorized", status: 403 });
    expect(applyLogOperationMock).not.toHaveBeenCalled();
  });

  it("calls applyLogOperation with an operation that deletes the session for a valid owner session", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    const fakeSuccess = {
      log: { ...existingLog, climbs: [{ ...existingLog.climbs[0], sessions: [] }] },
      commitMessage: "Delete session: Existing Problem",
      climbId: 3,
    };
    applyLogOperationMock.mockResolvedValueOnce({ ok: true, value: fakeSuccess });

    const { deleteSessionAction } = await import("../actions");
    const result = await deleteSessionAction(validInput);

    expect(applyLogOperationMock).toHaveBeenCalledTimes(1);
    const operation = applyLogOperationMock.mock.calls[0][0] as (log: unknown) => unknown;
    const opResult = operation(existingLog) as {
      ok: boolean;
      value?: { commitMessage: string; climbId: number; log: typeof existingLog };
    };
    expect(opResult.ok).toBe(true);
    expect(opResult.value?.commitMessage).toBe("Delete session: Existing Problem");
    expect(opResult.value?.log.climbs[0].sessions).toEqual([]);

    expect(result).toEqual({ ok: true, value: fakeSuccess });
  });

  it("surfaces a not-found storage error so the UI can trigger a reload", async () => {
    cookieValue = createSessionToken(OWNER_ID, SECRET);
    applyLogOperationMock.mockResolvedValueOnce({
      ok: false,
      error: { type: "not-found", message: "Session with id 0 not found on climb 3." },
    });

    const { deleteSessionAction } = await import("../actions");
    const result = await deleteSessionAction(validInput);

    expect(result).toEqual({
      ok: false,
      kind: "storage",
      error: { type: "not-found", message: "Session with id 0 not found on climb 3." },
    });
  });
});
