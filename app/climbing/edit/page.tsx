import { readLog } from "@/lib/climbingLog/githubStorage";
import { SignOutButton } from "./SignOutButton";
import { EditorRetryButton } from "./EditorRetryButton";
import { EditorLogList } from "./EditorLogList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditPage() {
  // The layout already gates every route under /climbing/edit: it redirects
  // signed-out visitors to sign-in and renders "Access denied" for a
  // signed-in non-owner, so reaching here means the request is the owner.
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
