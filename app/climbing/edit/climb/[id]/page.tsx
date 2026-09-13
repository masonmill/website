import Link from "next/link";
import { readLog } from "@/lib/climbingLog/githubStorage";
import { ClimbDetail } from "./ClimbDetail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClimbDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { id } = await params;
  const { session } = await searchParams;
  const climbId = Number(id);

  const result = await readLog("fresh");

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Couldn&apos;t load the log</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{result.error.message}</p>
        <Link href="/climbing/edit" className="text-sm underline">
          Back to log
        </Link>
      </main>
    );
  }

  const climb = Number.isInteger(climbId)
    ? result.value.log.climbs.find((c) => c.id === climbId)
    : undefined;

  if (!climb) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Climb not found</h1>
        <Link href="/climbing/edit" className="text-sm underline">
          Back to log
        </Link>
      </main>
    );
  }

  const focusedSessionId = session !== undefined ? Number(session) : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <ClimbDetail climb={climb} focusedSessionId={focusedSessionId} />
    </main>
  );
}
