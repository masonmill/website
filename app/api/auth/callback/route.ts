import { NextRequest, NextResponse } from "next/server";
import {
  getGithubClientId,
  getGithubClientSecret,
  getSessionSecret,
} from "@/lib/auth/config";
import {
  OAUTH_STATE_COOKIE_NAME,
  sanitizeEditorRedirectPath,
} from "@/lib/auth/redirect";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
}

interface GithubUserResponse {
  id: number;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (!code || !state || !stateCookie) {
    console.warn("Sign-in denied: missing OAuth code or state");
    return clearStateCookie(
      NextResponse.redirect(new URL("/climbing/edit", request.nextUrl.origin))
    );
  }

  const [expectedState, encodedRedirect] = stateCookie.split("|");
  if (!expectedState || state !== expectedState) {
    console.warn("Sign-in denied: OAuth state mismatch");
    return clearStateCookie(
      NextResponse.redirect(new URL("/climbing/edit", request.nextUrl.origin))
    );
  }
  const redirectPath = sanitizeEditorRedirectPath(
    encodedRedirect ? decodeURIComponent(encodedRedirect) : null
  );

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: getGithubClientId(),
        client_secret: getGithubClientSecret(),
        code,
        redirect_uri: new URL(
          "/api/auth/callback",
          request.nextUrl.origin
        ).toString(),
      }),
    }
  );

  const tokenData = (await tokenResponse.json()) as GithubTokenResponse;
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.warn("Sign-in denied: GitHub token exchange failed");
    return clearStateCookie(
      NextResponse.redirect(new URL("/climbing/edit", request.nextUrl.origin))
    );
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userResponse.ok) {
    console.warn("Sign-in denied: failed to fetch GitHub user profile");
    return clearStateCookie(
      NextResponse.redirect(new URL("/climbing/edit", request.nextUrl.origin))
    );
  }

  const user = (await userResponse.json()) as GithubUserResponse;
  const sessionToken = createSessionToken(user.id, getSessionSecret());

  const response = NextResponse.redirect(
    new URL(redirectPath, request.nextUrl.origin)
  );
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return clearStateCookie(response);
}
