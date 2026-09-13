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
