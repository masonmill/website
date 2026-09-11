function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getGithubClientId(): string {
  return requireEnv("GITHUB_OAUTH_CLIENT_ID");
}

export function getGithubClientSecret(): string {
  return requireEnv("GITHUB_OAUTH_CLIENT_SECRET");
}

export function getSessionSecret(): string {
  return requireEnv("SESSION_SECRET");
}

export function getOwnerGithubId(): number {
  const raw = requireEnv("OWNER_GITHUB_ID");
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    throw new Error("OWNER_GITHUB_ID must be a numeric GitHub user id");
  }
  return id;
}
