import type { Metadata } from "next";
import ClimbingLogView, { type LogEntry } from "./ClimbingLogView";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Climbing Log — Mason Miller",
};

interface LogData {
  entries: LogEntry[];
  nextID: number;
}

async function getLog(): Promise<LogData> {
  const res = await fetch(
    "https://raw.githubusercontent.com/masonmill/climbinglog/main/data/log.json",
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Failed to fetch climbing log: ${res.status}`);
  return res.json();
}

export default async function ClimbingPage() {
  try {
    const data = await getLog();
    const entries = [...data.entries].sort((a, b) => b.timestamp - a.timestamp);
    return <ClimbingLogView entries={entries} />;
  } catch {
    return <ClimbingLogView entries={null} />;
  }
}
