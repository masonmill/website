import { cookies } from "next/headers";
import { authorize } from "@/lib/auth/authorize";
import { getOwnerGithubId, getSessionSecret } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditPage() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const result = authorize(sessionValue, {
    sessionSecret: getSessionSecret(),
    ownerGithubId: getOwnerGithubId(),
  });

  if (!result.ok) {
    // The layout already redirected unauthenticated (401) visitors to sign
    // in, so reaching here means a signed-in, non-owner account (403).
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-neutral-500">
          This GitHub account does not have access to the climbing log
          editor.
        </p>
        <SignOutButton />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Climbing Log</h1>
        <SignOutButton />
      </header>
      <p className="text-neutral-500">Editor coming soon.</p>
    </main>
  );
}
