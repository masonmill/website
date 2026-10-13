import { readLog } from "@/lib/climbingLog/githubStorage";
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
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-6 pt-14 pb-20">
      {result.ok ? (
        <EditorLogList log={result.value.log} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-lg font-semibold">Couldn&apos;t load the log</h2>
          <p className="text-[#737373]">{result.error.message}</p>
          <EditorRetryButton />
        </div>
      )}
    </main>
  );
}
