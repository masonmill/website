export const OAUTH_STATE_COOKIE_NAME = "cl_oauth_state";

/**
 * Restricts post-login redirect targets to paths inside the editor, so the
 * login flow can never be used as an open redirect.
 */
export function sanitizeEditorRedirectPath(candidate: string | null): string {
  const fallback = "/climbing/edit";
  if (!candidate) return fallback;
  if (!candidate.startsWith("/climbing/edit")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
}
