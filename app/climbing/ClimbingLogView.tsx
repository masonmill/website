"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

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
  // True if any session of this climb has been sent. Once a climb is sent,
  // earlier project attempts are no longer treated as projects.
  climbSent: boolean;
  label: SendLabel;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADES = ["6a+/V3", "6b/V4", "6c/V5", "7a/V6", "7a+/V7"];

const GRADE_COLORS: Record<string, string> = {
  "6a+/V3": "text-green-700  bg-green-50",
  "6b/V4":  "text-blue-700   bg-blue-50",
  "6c/V5":  "text-orange-700 bg-orange-50",
  "7a/V6":  "text-red-700    bg-red-50",
  "7a+/V7": "text-purple-700 bg-purple-50",
};

const GRADE_COLORS_DARK: Record<string, string> = {
  "6a+/V3": "dark:text-green-400  dark:bg-green-950",
  "6b/V4":  "dark:text-blue-400   dark:bg-blue-950",
  "6c/V5":  "dark:text-orange-400 dark:bg-orange-950",
  "7a/V6":  "dark:text-red-400    dark:bg-red-950",
  "7a+/V7": "dark:text-purple-400 dark:bg-purple-950",
};

type StatusFilter = "all" | "sent" | "project";
type SendLabel = "Flash" | "Day flash" | "Repeat" | "Sent" | "Project";

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

// ─── Stats ───────────────────────────────────────────────────────────────────

interface GradeStat {
  grade: string;
  total: number;
  sent: number;
}

interface WeekBucket {
  weekStart: number; // epoch seconds of Monday
  sessions: number;
  attempts: number;
  sends: number;
}

const HEATMAP_MAX_WEEKS = 26;

function mondayOfWeek(epochSeconds: number): number {
  const d = new Date(epochSeconds * 1000);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function computeStats(climbs: LogClimb[]) {
  const totalClimbs = climbs.length;
  const sessions = climbs.flatMap((c) => c.sessions);
  const totalSessionCount = sessions.length;

  // A climb is "sent" if any session was sent
  const sentClimbs = climbs.filter((c) => c.sessions.some((s) => s.sent));
  const sendRate = totalClimbs > 0 ? sentClimbs.length / totalClimbs : 0;

  // Flash: first session, 1 attempt, sent
  const flashedClimbs = climbs.filter((c) => {
    const sorted = [...c.sessions].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.length > 0 && sorted[0].sent && sorted[0].attempts === 1;
  });
  const flashRate = totalClimbs > 0 ? flashedClimbs.length / totalClimbs : 0;

  // Average attempts to first send (only for sent climbs)
  const attemptsToSend = sentClimbs.map((c) => {
    const sorted = [...c.sessions].sort((a, b) => a.timestamp - b.timestamp);
    const firstSendIdx = sorted.findIndex((s) => s.sent);
    return sorted.slice(0, firstSendIdx + 1).reduce((sum, s) => sum + s.attempts, 0);
  });
  const avgAttemptsToSend =
    attemptsToSend.length > 0
      ? attemptsToSend.reduce((a, b) => a + b, 0) / attemptsToSend.length
      : 0;

  // Unique climbing days
  const daySet = new Set(sessions.map((s) => dateKey(s.timestamp)));
  const climbingDays = daySet.size;

  // Grade pyramid
  const gradeMap = new Map<string, { total: number; sent: number }>();
  for (const c of climbs) {
    const entry = gradeMap.get(c.grade) ?? { total: 0, sent: 0 };
    entry.total++;
    if (c.sessions.some((s) => s.sent)) entry.sent++;
    gradeMap.set(c.grade, entry);
  }
  const gradePyramid: GradeStat[] = GRADES.filter((g) => gradeMap.has(g)).map(
    (g) => ({ grade: g, ...gradeMap.get(g)! })
  );

  // Weekly activity heatmap
  const weekData = new Map<number, { days: Set<string>; attempts: number; sends: number }>();
  for (const c of climbs) {
    for (const s of c.sessions) {
      const monday = mondayOfWeek(s.timestamp);
      const entry = weekData.get(monday) ?? { days: new Set(), attempts: 0, sends: 0 };
      entry.days.add(dateKey(s.timestamp));
      entry.attempts += s.attempts;
      if (s.sent) entry.sends++;
      weekData.set(monday, entry);
    }
  }
  // Fill in gaps so empty weeks still show
  const allMondays = Array.from(weekData.keys()).sort((a, b) => a - b);
  const weeklyActivity: WeekBucket[] = [];
  if (allMondays.length > 0) {
    const first = allMondays[0];
    const last = allMondays[allMondays.length - 1];
    for (let m = first; m <= last; m += 7 * 86400) {
      const d = weekData.get(m);
      weeklyActivity.push({
        weekStart: m,
        sessions: d?.days.size ?? 0,
        attempts: d?.attempts ?? 0,
        sends: d?.sends ?? 0,
      });
    }
  }

  // Cap heatmap to most recent weeks
  const recentWeeks = weeklyActivity.length > HEATMAP_MAX_WEEKS
    ? weeklyActivity.slice(-HEATMAP_MAX_WEEKS)
    : weeklyActivity;

  return {
    totalClimbs,
    totalSessionCount,
    sendRate,
    flashRate,
    avgAttemptsToSend,
    climbingDays,
    gradePyramid,
    recentWeeks,
  };
}

// ─── Stats Panel ─────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3.5 py-3">
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

function WeeklyHeatmap({ weeks }: { weeks: WeekBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (weeks.length === 0) return null;

  // Resting summary: total weeks visualized + avg sessions per active week.
  const activeWeeks = weeks.filter((w) => w.sessions > 0).length;
  const totalSessions = weeks.reduce((sum, w) => sum + w.sessions, 0);
  const avgPerWeek = activeWeeks > 0 ? (totalSessions / activeWeeks).toFixed(1) : "0";

  // Activity score: attempts are the primary driver of volume; gym days add a
  // small bonus so a day with many short sessions still registers higher than
  // a single casual visit with the same attempt count.
  function activityScore(w: WeekBucket): number {
    return w.attempts + w.sessions * 3;
  }
  const maxScore = Math.max(...weeks.map(activityScore));

  function intensity(w: WeekBucket): string {
    const score = activityScore(w);
    if (score === 0) return "bg-gray-100 dark:bg-gray-800";
    const ratio = score / maxScore;
    if (ratio <= 0.33) return "bg-green-200 dark:bg-green-900";
    if (ratio <= 0.66) return "bg-green-400 dark:bg-green-700";
    return "bg-green-600 dark:bg-green-500";
  }

  function weekRange(epochSeconds: number): string {
    const start = new Date(epochSeconds * 1000);
    const end = new Date((epochSeconds + 6 * 86400) * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  const hoveredWeek = hovered !== null ? weeks.find((w) => w.weekStart === hovered) : null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        Weekly Activity
      </h3>
      <div className="flex flex-wrap gap-1">
        {weeks.map((w) => (
          <div
            key={w.weekStart}
            className={`w-4 h-4 rounded-sm ${intensity(w)} transition-colors cursor-default`}
            onMouseEnter={() => setHovered(w.weekStart)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      {/* Tooltip / detail area */}
      <div className="mt-3 min-h-[3.5rem]">
        {hoveredWeek && hoveredWeek.sessions > 0 ? (
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
            <p className="font-medium">{weekRange(hoveredWeek.weekStart)}</p>
            <p className="text-gray-500 dark:text-gray-400">
              {hoveredWeek.sessions} session{hoveredWeek.sessions !== 1 ? "s" : ""}
              {" · "}
              {hoveredWeek.attempts} attempt{hoveredWeek.attempts !== 1 ? "s" : ""}
              {" · "}
              {hoveredWeek.sends} send{hoveredWeek.sends !== 1 ? "s" : ""}
            </p>
          </div>
        ) : hoveredWeek ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {weekRange(hoveredWeek.weekStart)} — Rest week
          </p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {weeks.length} week{weeks.length !== 1 ? "s" : ""} · {avgPerWeek} sessions/week avg
          </p>
        )}
      </div>

    </div>
  );
}

function StatsPanel({ stats }: { stats: ReturnType<typeof computeStats> }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          value={`${Math.round(stats.sendRate * 100)}%`}
          label="Send rate"
        />
        <StatCard
          value={`${Math.round(stats.flashRate * 100)}%`}
          label="Flash rate"
        />
        <StatCard
          value={stats.avgAttemptsToSend > 0 ? stats.avgAttemptsToSend.toFixed(1) : "—"}
          label="Avg attempts to send"
        />
        <StatCard value={`${stats.climbingDays}`} label="Climbing days" />
      </div>

      {/* Grade pyramid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Grade Pyramid
        </h3>
        <div className="flex flex-col gap-2.5">
          {stats.gradePyramid.map((g) => (
            <div key={g.grade} className="flex items-center gap-2">
              <span
                className={`text-xs font-medium w-14 shrink-0 px-1.5 py-0.5 rounded-full text-center ${
                  GRADE_COLORS[g.grade] ?? "text-gray-600 bg-gray-100"
                } ${GRADE_COLORS_DARK[g.grade] ?? ""}`}
              >
                {g.grade}
              </span>
              {/* Tally: filled square per send, outlined per project */}
              <div className="flex-1 flex flex-wrap gap-1 items-center">
                {Array.from({ length: g.sent }).map((_, i) => (
                  <span
                    key={`s${i}`}
                    className="w-2.5 h-2.5 rounded-sm bg-green-500 dark:bg-green-500"
                  />
                ))}
                {Array.from({ length: g.total - g.sent }).map((_, i) => (
                  <span
                    key={`p${i}`}
                    className="w-2.5 h-2.5 rounded-sm border border-gray-300 dark:border-gray-600 box-border"
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-11 text-right shrink-0 font-mono tabular-nums">
                {g.sent}/{g.total}
              </span>
            </div>
          ))}
        </div>
        {/* Tally legend */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-green-500 dark:bg-green-500" />
            Sent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm border border-gray-300 dark:border-gray-600 box-border" />
            Project
          </span>
        </div>
      </div>

      {/* Weekly activity heatmap */}
      <WeeklyHeatmap weeks={stats.recentWeeks} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenClimbs(climbs: LogClimb[]): SessionRow[] {
  return climbs.flatMap((climb) => {
    // Sort once per climb so sendLabel doesn't re-sort per row.
    const sorted = [...climb.sessions].sort((a, b) => a.timestamp - b.timestamp);
    const climbSent = climb.sessions.some((s) => s.sent);
    return climb.sessions.map((session) => {
      const idx = sorted.findIndex((s) => s.id === session.id);
      const label = computeLabel(session, idx, sorted);
      return {
        climbId: climb.id,
        sessionId: session.id,
        name: climb.name,
        board: climb.board,
        grade: climb.grade,
        timestamp: session.timestamp,
        attempts: session.attempts,
        incline: session.incline,
        climbSent,
        label,
      };
    });
  });
}

function computeLabel(session: LogSession, idx: number, sortedSessions: LogSession[]): SendLabel {
  if (!session.sent) return "Project";
  const previouslySent = sortedSessions.slice(0, idx).some((s) => s.sent);
  if (previouslySent) return "Repeat";
  if (session.attempts === 1 && idx === 0) return "Flash";
  if (session.attempts === 1) return "Day flash";
  return "Sent";
}

function dateKey(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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
  const daySet = new Set(
    climbs.flatMap((c) => c.sessions.map((s) => dateKey(s.timestamp)))
  );
  return daySet.size;
}

// Tailwind class bundles per send-label. Flash gets the loudest treatment
// (filled pill), Day flash stays as plain bold text, Sent/Repeat become
// outlined pills, Project is a muted gray text label.
const LABEL_STYLES: Record<SendLabel, string> = {
  "Flash":
    "inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide " +
    "bg-green-500 text-white dark:bg-green-500 dark:text-white " +
    "ring-2 ring-green-500/20",
  "Day flash":
    "text-sm font-semibold text-green-600 dark:text-green-400",
  "Sent":
    "inline-block px-2 py-0.5 rounded-full text-xs font-semibold " +
    "border border-green-600 text-green-600 " +
    "dark:border-green-400 dark:text-green-400",
  "Repeat":
    "inline-block px-2 py-0.5 rounded-full text-xs font-semibold " +
    "border border-blue-600 text-blue-600 " +
    "dark:border-blue-400 dark:text-blue-400",
  "Project":
    "text-sm font-medium text-gray-400 dark:text-gray-500",
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  grades,
  selectedGrade,
  onGradeChange,
  status,
  onStatusChange,
}: {
  grades: string[];
  selectedGrade: string;
  onGradeChange: (g: string) => void;
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-2 flex-1">
      {/* Grade pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onGradeChange("all")}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            selectedGrade === "all"
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          All Grades
        </button>
        {grades.map((grade) => (
          <button
            key={grade}
            onClick={() => onGradeChange(grade === selectedGrade ? "all" : grade)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              grade === selectedGrade
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : `${GRADE_COLORS[grade]} ${GRADE_COLORS_DARK[grade]}`
            }`}
          >
            {grade}
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "sent", "project"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors capitalize ${
              status === s
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {s === "all" ? "All Status" : s === "sent" ? "Sent" : "Project"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Expanded Climb Detail ────────────────────────────────────────────────────

function ClimbHistory({ climb, activeSessionId }: { climb: LogClimb; activeSessionId: number }) {
  // Sort chronologically once for label computation, then reverse for display.
  const chronological = [...climb.sessions].sort((a, b) => a.timestamp - b.timestamp);
  const sorted = [...chronological].reverse();
  const totalAttempts = sorted.reduce((sum, s) => sum + s.attempts, 0);
  const everSent = sorted.some((s) => s.sent);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-1">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          {/* Summary line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2.5">
            <span>{sorted.length} session{sorted.length !== 1 ? "s" : ""}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{totalAttempts} total attempt{totalAttempts !== 1 ? "s" : ""}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className={everSent ? "text-green-600 dark:text-green-400" : ""}>
              {everSent ? "Sent" : "Project"}
            </span>
          </div>

          {/* Session list */}
          <div className="flex flex-col gap-1">
            {sorted.map((session) => {
              const isActive = session.id === activeSessionId;
              const idx = chronological.findIndex((s) => s.id === session.id);
              const label = computeLabel(session, idx, chronological);
              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? label === "Repeat"
                        ? "bg-blue-100 dark:bg-blue-900/40"
                        : session.sent
                          ? "bg-green-100 dark:bg-green-900/40"
                          : "bg-gray-200/70 dark:bg-gray-700/50"
                      : ""
                  }`}
                >
                  <span className={isActive ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-300"}>
                    {shortDate(session.timestamp)}
                  </span>
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <span>{session.attempts} attempt{session.attempts !== 1 ? "s" : ""}</span>
                    <span>{session.incline}°</span>
                    <span className="w-16 text-right">
                      <span className={LABEL_STYLES[label]}>{label}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ClimbingLogView({ climbs }: { climbs: LogClimb[] | null }) {
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedClimb, setExpandedClimb] = useState<string | null>(null);

  const stats = useMemo(() => (climbs ? computeStats(climbs) : null), [climbs]);

  // Build a lookup from climb name to climb data (for expand)
  const climbMap = useMemo(() => {
    if (!climbs) return new Map<number, LogClimb>();
    return new Map(climbs.map((c) => [c.id, c]));
  }, [climbs]);

  // Available grades in the data
  const availableGrades = useMemo(() => {
    if (!climbs) return [];
    const gradeSet = new Set(climbs.map((c) => c.grade));
    return GRADES.filter((g) => gradeSet.has(g));
  }, [climbs]);

  // Flatten + sort once when climbs change (not on every filter toggle).
  const allRows = useMemo(() => {
    if (!climbs) return [];
    return flattenClimbs(climbs).sort((a, b) => b.timestamp - a.timestamp);
  }, [climbs]);

  // Apply filters (cheap subset of the pre-sorted array).
  const filtered = useMemo(() => {
    let rows = allRows;
    if (gradeFilter !== "all") {
      rows = rows.filter((r) => r.grade === gradeFilter);
    }
    if (statusFilter === "sent") {
      rows = rows.filter((r) => r.climbSent);
    } else if (statusFilter === "project") {
      rows = rows.filter((r) => !r.climbSent);
    }
    return rows;
  }, [allRows, gradeFilter, statusFilter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const toggleExpand = (key: string) => {
    setExpandedClimb((prev) => (prev === key ? null : key));
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 lg:items-start">
        {/* Sidebar: header + stats — sticky on desktop */}
        <motion.aside
          className="w-full lg:w-72 shrink-0 lg:sticky lg:top-8"
          {...fadeDown}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ← back
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3">Climbing Log</h1>
            {climbs === null ? (
              <p className="text-gray-400 mt-1 text-sm">Unavailable right now.</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                {(() => { const s = totalSessions(climbs); return <>{climbs.length} problem{climbs.length !== 1 ? "s" : ""} · {s} session{s !== 1 ? "s" : ""}</>; })()}
              </p>
            )}
          </div>

          {climbs !== null && <StatsPanel stats={stats!} />}
        </motion.aside>

        {/* Log column */}
        {climbs !== null && (
          <div className="flex-1 min-w-0">
            <motion.div className="flex items-center gap-3 mb-6" {...fadeDown} transition={{ duration: 0.6, delay: 0.15 }}>
              <FilterBar
                grades={availableGrades}
                selectedGrade={gradeFilter}
                onGradeChange={setGradeFilter}
                status={statusFilter}
                onStatusChange={setStatusFilter}
              />
              <a
                href="https://github.com/masonmill/climbinglog"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                aria-label="GitHub"
              >
                <Image src="/github.svg" alt="GitHub" width={16} height={16} className="svg-icon" />
              </a>
            </motion.div>

            {filtered.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No sessions match the current filters.</p>
            ) : (
              <>
              <motion.div className="flex flex-col gap-6 sm:gap-8" {...staggerList}>
                {groups.map(([date, dayRows]) => (
                  <motion.div key={date} {...fadeUp}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                      {date}
                    </p>
                    <div className="flex flex-col rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                      {dayRows.map((row, i) => {
                        const key = `${row.climbId}-${row.sessionId}`;
                        const isExpanded = expandedClimb === key;
                        const climb = climbMap.get(row.climbId);
                        const hasHistory = climb && climb.sessions.length > 1;

                        return (
                          <div
                            key={key}
                            className={i < dayRows.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}
                          >
                            <div
                              className={`flex items-start justify-between gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 ${
                                hasHistory ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" : ""
                              }`}
                              onClick={() => hasHistory && toggleExpand(key)}
                            >
                              <div className="flex flex-col gap-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-base sm:text-lg font-medium truncate">{row.name}</span>
                                  {hasHistory && (
                                    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                                      isExpanded
                                        ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                                    }`}>
                                      {climb!.sessions.length}
                                      <ChevronDown
                                        size={12}
                                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-sm sm:text-base text-gray-500 dark:text-gray-400">
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${GRADE_COLORS[row.grade] ?? "text-gray-600 bg-gray-100"} ${GRADE_COLORS_DARK[row.grade] ?? ""}`}
                                  >
                                    {row.grade}
                                  </span>
                                  <span className="hidden sm:inline">{row.board}</span>
                                  <span className="sm:hidden">{row.board.replace("MoonBoard ", "MB")}</span>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <span>{row.incline}°</span>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <span>{row.attempts} attempt{row.attempts !== 1 ? "s" : ""}</span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                                <span className={LABEL_STYLES[row.label]}>{row.label}</span>
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && climb && (
                                <ClimbHistory climb={climb} activeSessionId={row.sessionId} />
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <p className="text-center text-xs text-gray-300 dark:text-gray-700 mt-12 mb-4 select-none">
                You&apos;ve reached the bottom. More sends coming soon.
              </p>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
