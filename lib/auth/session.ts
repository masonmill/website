import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "cl_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  githubId: number;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Creates a signed, self-contained session token encoding the GitHub user id.
 * The token is `<base64url payload>.<base64url hmac signature>`.
 */
export function createSessionToken(
  githubId: number,
  secret: string,
  now: number = Date.now()
): string {
  const iat = Math.floor(now / 1000);
  const exp = iat + SESSION_MAX_AGE_SECONDS;
  const payload: SessionPayload = { githubId, iat, exp };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a session token's signature and expiry.
 * Returns the decoded payload when valid, or null when the token is
 * missing, malformed, tampered with, or expired.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now()
): SessionPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (
    typeof payload.githubId !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  const nowSeconds = Math.floor(now / 1000);
  if (nowSeconds >= payload.exp) return null;

  return payload;
}
