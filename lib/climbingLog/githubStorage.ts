import "server-only";

import { revalidatePath } from "next/cache";
import { parseLog, serializeLog, type ClimbingLogError, type Log, type OperationSuccess, type Result } from "./climbingLog";

const OWNER = "masonmill";
const REPO = "climbinglog";
const BRANCH = "main";
const FILE_PATH = "data/log.json";

export type GitHubStorageError = ClimbingLogError | { type: "github"; message: string };

export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: GitHubStorageError };

function ok<T>(value: T): StorageResult<T> {
  return { ok: true, value };
}

function githubErr<T>(message: string): StorageResult<T> {
  return { ok: false, error: { type: "github", message } };
}

function fromClimbingLogError<T>(result: Extract<Result<unknown>, { ok: false }>): StorageResult<T> {
  return { ok: false, error: result.error };
}

function requireToken(): string {
  const token = process.env.CLIMBINGLOG_GITHUB_PAT;
  if (!token) {
    throw new Error("Missing required environment variable: CLIMBINGLOG_GITHUB_PAT");
  }
  return token;
}

function contentsUrl(): string {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
}

async function extractGithubErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body && typeof body.message === "string") return body.message;
  } catch {
    // Ignore JSON parse failures and fall back to the status text below.
  }
  return `GitHub API request failed with status ${res.status}`;
}

/**
 * Reads the current log.json from the climbinglog repo via the GitHub
 * Contents API.
 *
 * `mode: "fresh"` (default) never uses HTTP or Next.js fetch caching — used
 * before every write, so the operation always applies to the latest file
 * and blob SHA.
 *
 * `mode: "cached"` opts into Next's persistent Data Cache (kept until a
 * write calls revalidatePath("/climbing")) so the public page stays
 * statically served between edits instead of hitting GitHub on every
 * request and being forced into fully dynamic rendering.
 */
export async function readLog(
  mode: "fresh" | "cached" = "fresh"
): Promise<StorageResult<{ log: Log; sha: string }>> {
  const token = requireToken();

  let res: Response;
  try {
    res = await fetch(contentsUrl(), {
      ...(mode === "fresh" ? { cache: "no-store" as const } : { next: { revalidate: false } }),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
  } catch (error) {
    return githubErr(`Failed to reach GitHub: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!res.ok) {
    return githubErr(await extractGithubErrorMessage(res));
  }

  const body = (await res.json()) as { content: string; sha: string };
  const decoded = Buffer.from(body.content, "base64").toString("utf-8");

  const parseResult = parseLog(decoded);
  if (!parseResult.ok) {
    return fromClimbingLogError(parseResult);
  }

  return ok({ log: parseResult.value, sha: body.sha });
}

async function putLog(log: Log, sha: string, commitMessage: string): Promise<Response> {
  const token = requireToken();
  const content = Buffer.from(serializeLog(log), "utf-8").toString("base64");

  return fetch(contentsUrl(), {
    method: "PUT",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      content,
      sha,
      branch: BRANCH,
    }),
  });
}

/**
 * Applies a slice-001 operation to the log stored at data/log.json in the
 * climbinglog repo, committing the result via the GitHub Contents API.
 *
 * On a 409/422 conflict from the PUT (stale sha), the file is re-read and
 * the same operation is re-applied to the fresh log, then the PUT is
 * retried exactly once more. If the second PUT also fails, the operation
 * is reported as failed.
 */
export async function applyLogOperation(
  operation: (log: Log) => Result<OperationSuccess>
): Promise<StorageResult<OperationSuccess>> {
  const readResult = await readLog("fresh");
  if (!readResult.ok) return readResult;

  const opResult = operation(readResult.value.log);
  if (!opResult.ok) return fromClimbingLogError(opResult);

  let res: Response;
  try {
    res = await putLog(opResult.value.log, readResult.value.sha, opResult.value.commitMessage);
  } catch (error) {
    return githubErr(`Failed to reach GitHub: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (res.ok) {
    return finishSuccess(opResult.value);
  }

  if (res.status === 409 || res.status === 422) {
    const retryReadResult = await readLog("fresh");
    if (!retryReadResult.ok) return retryReadResult;

    const retryOpResult = operation(retryReadResult.value.log);
    if (!retryOpResult.ok) return fromClimbingLogError(retryOpResult);

    let retryRes: Response;
    try {
      retryRes = await putLog(retryOpResult.value.log, retryReadResult.value.sha, retryOpResult.value.commitMessage);
    } catch (error) {
      return githubErr(`Failed to reach GitHub: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (retryRes.ok) {
      return finishSuccess(retryOpResult.value);
    }

    return githubErr(await extractGithubErrorMessage(retryRes));
  }

  return githubErr(await extractGithubErrorMessage(res));
}

function finishSuccess(value: OperationSuccess): StorageResult<OperationSuccess> {
  try {
    revalidatePath("/climbing");
  } catch (error) {
    console.error("revalidatePath(\"/climbing\") failed:", error);
  }
  return ok(value);
}
