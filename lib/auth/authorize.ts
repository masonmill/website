import { verifySessionToken } from "./session";

export type AuthorizeResult =
  | { ok: true; githubId: number }
  | { ok: false; status: 401 | 403 };

export interface AuthorizeOptions {
  sessionSecret: string;
  ownerGithubId: number;
  now?: number;
}

/**
 * Reusable server-side authorization check.
 *
 * - No cookie, malformed cookie, tampered signature, or expired session -> 401.
 * - Valid session but GitHub id does not match the configured owner -> 403.
 * - Valid session for the owner -> allowed.
 */
export function authorize(
  sessionCookieValue: string | undefined | null,
  { sessionSecret, ownerGithubId, now }: AuthorizeOptions
): AuthorizeResult {
  const payload = verifySessionToken(sessionCookieValue, sessionSecret, now);
  if (!payload) {
    return { ok: false, status: 401 };
  }

  if (payload.githubId !== ownerGithubId) {
    console.warn(
      `Access denied: GitHub id ${payload.githubId} is not the configured owner`
    );
    return { ok: false, status: 403 };
  }

  return { ok: true, githubId: payload.githubId };
}
