import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGithubClientId } from "@/lib/auth/config";
import {
  OAUTH_STATE_COOKIE_NAME,
  sanitizeEditorRedirectPath,
} from "@/lib/auth/redirect";

const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60; // 10 minutes, just long enough to sign in

export async function GET(request: NextRequest) {
  const redirectPath = sanitizeEditorRedirectPath(
    request.nextUrl.searchParams.get("redirect")
  );
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", getGithubClientId());
  authorizeUrl.searchParams.set(
    "redirect_uri",
    new URL("/api/auth/callback", request.nextUrl.origin).toString()
  );
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("allow_signup", "false");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    OAUTH_STATE_COOKIE_NAME,
    `${state}|${encodeURIComponent(redirectPath)}`,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    }
  );
  return response;
}
