import type { Metadata } from "next";
import { readLog } from "@/lib/climbingLog/githubStorage";
import ClimbingLogView from "./ClimbingLogView";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Climbing Log — Mason Miller",
};

export default async function ClimbingPage() {
  try {
    const result = await readLog("cached");
    if (!result.ok) return <ClimbingLogView climbs={null} />;
    return <ClimbingLogView climbs={result.value.log.climbs} />;
  } catch {
    return <ClimbingLogView climbs={null} />;
  }
}
