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
      <main className="mx-auto flex max-w-[760px] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Couldn&apos;t load the log</h1>
        <p className="text-[#737373]">{result.error.message}</p>
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
      <main className="mx-auto flex max-w-[760px] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Climb not found</h1>
        <Link href="/climbing/edit" className="text-sm underline">
          Back to log
        </Link>
      </main>
    );
  }

  const focusedSessionId = session !== undefined ? Number(session) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-6 pt-14 pb-20">
      <ClimbDetail
        climb={climb}
        allClimbs={result.value.log.climbs.map((c) => ({ name: c.name, board: c.board, grade: c.grade }))}
        focusedSessionId={focusedSessionId}
      />
    </main>
  );
}
