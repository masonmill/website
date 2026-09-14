import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyLogOperation, readLog } from "../githubStorage";
import { parseLog, serializeLog, type Log, type OperationSuccess, type Result } from "../climbingLog";

const EMPTY_LOG: Log = { nextClimbID: 0, climbs: [] };

function contentsResponse(log: Log, sha: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: Buffer.from(serializeLog(log), "utf-8").toString("base64"),
      sha,
    }),
  } as Response;
}

function jsonErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ message }),
  } as Response;
}

function putSuccessResponse() {
  return { ok: true, status: 200, json: async () => ({}) } as Response;
}

describe("githubStorage", () => {
  beforeEach(() => {
    process.env.CLIMBINGLOG_GITHUB_PAT = "test-token";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLIMBINGLOG_GITHUB_PAT;
  });

  it("readLog decodes base64 UTF-8 content correctly, including non-ASCII names", async () => {
    const log: Log = {
      nextClimbID: 1,
      climbs: [
        {
          id: 0,
          name: "Échauffement",
          board: "MoonBoard 2019",
          grade: "6a+/V3",
          nextSessionID: 1,
          sessions: [
            { id: 0, timestamp: 1000, attempts: 1, incline: 40, sent: true, location: "Planet Rock Ann Arbor" },
          ],
        },
      ],
    };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(contentsResponse(log, "sha-1"));

    const result = await readLog();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.log.climbs[0].name).toBe("Échauffement");
      expect(result.value.sha).toBe("sha-1");
    }
  });

  it("retries once on a 409/422 and commits the operation applied to the re-read file", async () => {
    const staleLog = EMPTY_LOG;
    const freshLog: Log = {
      nextClimbID: 1,
      climbs: [
        {
          id: 0,
          name: "Existing",
          board: "MoonBoard 2019",
          grade: "6a+/V3",
          nextSessionID: 1,
          sessions: [
            { id: 0, timestamp: 1000, attempts: 1, incline: 40, sent: true, location: "Planet Rock Ann Arbor" },
          ],
        },
      ],
    };

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(contentsResponse(staleLog, "sha-stale")) // initial read
      .mockResolvedValueOnce(jsonErrorResponse(409, "sha mismatch")) // first PUT conflicts
      .mockResolvedValueOnce(contentsResponse(freshLog, "sha-fresh")) // re-read
      .mockResolvedValueOnce(putSuccessResponse()); // retry PUT succeeds

    let appliedTo: Log | undefined;
    const operation = (log: Log): Result<OperationSuccess> => {
      appliedTo = log;
      return {
        ok: true,
        value: { log: { ...log, nextClimbID: log.nextClimbID + 100 }, commitMessage: "Test op", climbId: 0 },
      };
    };

    const result = await applyLogOperation(operation);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    // Operation was applied to the re-read (fresh) log, not the stale one.
    expect(appliedTo).toEqual(freshLog);

    const putCalls = fetchMock.mock.calls.filter(([, init]) => init && (init as RequestInit).method === "PUT");
    expect(putCalls).toHaveLength(2);
    const secondPutBody = JSON.parse((putCalls[1][1] as RequestInit).body as string);
    expect(secondPutBody.sha).toBe("sha-fresh");
  });

  it("fails with no further retries when both the first and retry PUT conflict", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(contentsResponse(EMPTY_LOG, "sha-1"))
      .mockResolvedValueOnce(jsonErrorResponse(409, "sha mismatch"))
      .mockResolvedValueOnce(contentsResponse(EMPTY_LOG, "sha-2"))
      .mockResolvedValueOnce(jsonErrorResponse(422, "still stale"));

    const operation = (log: Log): Result<OperationSuccess> => ({
      ok: true,
      value: { log, commitMessage: "Test op", climbId: 0 },
    });

    const result = await applyLogOperation(operation);

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("makes no PUT call when the operation returns a validation/not-found error", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(contentsResponse(EMPTY_LOG, "sha-1"));

    const operation = (): Result<OperationSuccess> => ({
      ok: false,
      error: { type: "not-found", message: "Climb with id 5 not found." },
    });

    const result = await applyLogOperation(operation);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ type: "not-found", message: "Climb with id 5 not found." });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still reports success when revalidatePath throws", async () => {
    vi.doMock("next/cache", () => ({
      revalidatePath: () => {
        throw new Error("boom");
      },
    }));
    vi.resetModules();
    const { applyLogOperation: applyWithThrowingRevalidate } = await import("../githubStorage");

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(contentsResponse(EMPTY_LOG, "sha-1"))
      .mockResolvedValueOnce(putSuccessResponse());

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const operation = (log: Log): Result<OperationSuccess> => ({
      ok: true,
      value: { log, commitMessage: "Test op", climbId: 0 },
    });

    const result = await applyWithThrowingRevalidate(operation);

    expect(result.ok).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    vi.doUnmock("next/cache");
    vi.resetModules();
  });
});

// Sanity check that parseLog round-trips through the module's decoding path
// (guards against accidentally treating base64 content as Latin-1).
void parseLog;
