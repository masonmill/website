import type { Metadata } from "next";
import ClimbingLogView, { type LogClimb } from "./ClimbingLogView";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Climbing Log — Mason Miller",
};

interface LogData {
  climbs: LogClimb[];
  nextClimbID: number;
}

async function getLog(): Promise<LogData> {
  const res = await fetch(
    "https://raw.githubusercontent.com/masonmill/climbinglog/refactor/data/log.json",
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Failed to fetch climbing log: ${res.status}`);
  return res.json();
}

export default async function ClimbingPage() {
  try {
    const data = await getLog();
    if (!data.climbs) return <ClimbingLogView climbs={null} />;
    return <ClimbingLogView climbs={data.climbs} />;
  } catch {
    return <ClimbingLogView climbs={null} />;
  }
}
