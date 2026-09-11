import { describe, expect, it } from "vitest";
import { authorize } from "../authorize";
import { createSessionToken } from "../session";

const SECRET = "test-secret";
const OWNER_ID = 12345;
const OTHER_ID = 99999;

describe("authorize", () => {
  it("returns 401 when there is no cookie", () => {
    const result = authorize(undefined, {
      sessionSecret: SECRET,
      ownerGithubId: OWNER_ID,
    });
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 401 for a tampered cookie", () => {
    const token = createSessionToken(OWNER_ID, SECRET);
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    const result = authorize(tampered, {
      sessionSecret: SECRET,
      ownerGithubId: OWNER_ID,
    });
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 401 for an expired cookie", () => {
    const issuedAt = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
    const token = createSessionToken(OWNER_ID, SECRET, issuedAt);
    const result = authorize(token, {
      sessionSecret: SECRET,
      ownerGithubId: OWNER_ID,
    });
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 403 for a valid cookie belonging to a non-owner", () => {
    const token = createSessionToken(OTHER_ID, SECRET);
    const result = authorize(token, {
      sessionSecret: SECRET,
      ownerGithubId: OWNER_ID,
    });
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it("allows the request through for a valid cookie belonging to the owner", () => {
    const token = createSessionToken(OWNER_ID, SECRET);
    const result = authorize(token, {
      sessionSecret: SECRET,
      ownerGithubId: OWNER_ID,
    });
    expect(result).toEqual({ ok: true, githubId: OWNER_ID });
  });

  it("returns 401 when the cookie was signed with a different secret", () => {
    const token = createSessionToken(OWNER_ID, "wrong-secret");
    const result = authorize(token, {
      sessionSecret: SECRET,
      ownerGithubId: OWNER_ID,
    });
    expect(result).toEqual({ ok: false, status: 401 });
  });
});
