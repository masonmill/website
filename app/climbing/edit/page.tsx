import { cookies } from "next/headers";
import { authorize } from "@/lib/auth/authorize";
import { getOwnerGithubId, getSessionSecret } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { readLog } from "@/lib/climbingLog/githubStorage";
import { SignOutButton } from "./SignOutButton";
import { EditorRetryButton } from "./EditorRetryButton";
import { EditorLogList } from "./EditorLogList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditPage() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const authResult = authorize(sessionValue, {
    sessionSecret: getSessionSecret(),
    ownerGithubId: getOwnerGithubId(),
  });

  if (!authResult.ok) {
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

  const result = await readLog("fresh");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Climbing Log</h1>
        <SignOutButton />
      </header>
      {result.ok ? (
        <EditorLogList log={result.value.log} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-lg font-semibold">Couldn&apos;t load the log</h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {result.error.message}
          </p>
          <EditorRetryButton />
        </div>
      )}
    </main>
  );
}
