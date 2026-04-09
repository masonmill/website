"use client";

import { motion } from "motion/react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogSession {
  id: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

export interface LogClimb {
  id: number;
  name: string;
  board: string;
  grade: string;
  sessions: LogSession[];
}

// Flattened for display: one row per session, with climb info attached.
interface SessionRow {
  climbId: number;
  sessionId: number;
  name: string;
  board: string;
  grade: string;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
}

// ─── Grade colors ─────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  "6a+/V3": "text-green-700  bg-green-50",
  "6b/V4":  "text-blue-700   bg-blue-50",
  "6c/V5":  "text-orange-700 bg-orange-50",
  "7a/V6":  "text-red-700    bg-red-50",
  "7a+/V7": "text-purple-700 bg-purple-50",
};

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeDown = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerList = {
  initial: "hidden",
  animate: "visible",
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  },
};

const fadeUp = {
  variants: {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenClimbs(climbs: LogClimb[]): SessionRow[] {
  return climbs.flatMap((climb) =>
    climb.sessions.map((session) => ({
      climbId: climb.id,
      sessionId: session.id,
      name: climb.name,
      board: climb.board,
      grade: climb.grade,
      timestamp: session.timestamp,
      attempts: session.attempts,
      incline: session.incline,
      sent: session.sent,
    }))
  );
}

function dateKey(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupByDate(rows: SessionRow[]): [string, SessionRow[]][] {
  const map = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const key = dateKey(row.timestamp);
    const group = map.get(key);
    if (group) group.push(row);
    else map.set(key, [row]);
  }
  return Array.from(map.entries());
}

function totalSessions(climbs: LogClimb[]): number {
  return climbs.reduce((sum, c) => sum + c.sessions.length, 0);
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ClimbingLogView({ climbs }: { climbs: LogClimb[] | null }) {
  const rows = climbs ? flattenClimbs(climbs).sort((a, b) => b.timestamp - a.timestamp) : [];
  const groups = climbs ? groupByDate(rows) : [];

  return (
    <main className="flex justify-center min-h-screen px-4 py-12">
      <div className="max-w-2xl w-full">

        <motion.div className="mb-8" {...fadeDown}>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← back
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mt-3">Climbing Log</h1>
          {climbs === null ? (
            <p className="text-gray-400 mt-1 text-sm">Unavailable right now.</p>
          ) : (
            <p className="text-gray-500 mt-1 text-sm">
              {climbs.length} problem{climbs.length !== 1 ? "s" : ""} · {totalSessions(climbs)} session{totalSessions(climbs) !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>

        {climbs !== null && (
          <motion.div className="flex flex-col gap-8" {...staggerList}>
            {groups.map(([date, dayRows]) => (
              <motion.div key={date} {...fadeUp}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  {date}
                </p>
                <div className="flex flex-col rounded-xl border border-gray-100 overflow-hidden">
                  {dayRows.map((row, i) => (
                    <div
                      key={`${row.climbId}-${row.sessionId}`}
                      className={`flex items-start justify-between gap-4 px-4 py-4 ${i < dayRows.length - 1 ? "border-b border-gray-100" : ""}`}
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-lg font-medium">{row.name}</span>
                        <div className="flex items-center gap-2 flex-wrap text-base text-gray-500">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${GRADE_COLORS[row.grade] ?? "text-gray-600 bg-gray-100"}`}
                          >
                            {row.grade}
                          </span>
                          <span>{row.board}</span>
                          <span className="text-gray-300">·</span>
                          <span>{row.incline}°</span>
                          <span className="text-gray-300">·</span>
                          <span>{row.attempts} attempt{row.attempts !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                        <span className={`text-base font-medium ${row.sent ? "text-green-600" : "text-gray-400"}`}>
                          {row.sent ? "Sent" : "Project"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>
    </main>
  );
}
