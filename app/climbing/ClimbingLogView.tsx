"use client";

import { useEffect, useMemo, useState } from "react";
import SiteChrome from "../SiteChrome";
import { BoardLogo, GRADE_COLORS, GradeTag, LABEL_STYLES, SendLabelPill } from "./styles";
import {
  BOARDS,
  BOARD_SHORT_NAMES,
  GRADES,
  LOCATIONS,
  LOCATION_SHORT_NAMES,
  computeSessionLabel,
  type SendLabel,
} from "@/lib/climbingLog/climbingLog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogSession {
  id: number;
  timestamp: number;
  attempts: number;
  incline: number;
  sent: boolean;
  location: string;
  notes?: string;
}

export interface LogClimb {
  id: number;
  name: string;
  board: string;
  grade: string;
  sessions: LogSession[];
}

// One row per session, with its climb attached.
interface SessionRow {
  key: string;
  climb: LogClimb;
  session: LogSession;
  label: SendLabel;
  // True if any session of this climb has been sent. Once a climb is sent,
  // earlier project attempts are no longer treated as projects.
  climbSent: boolean;
}

// One dot on the chart per climb: where it was sent, or last tried.
interface ChartPoint {
  id: number;
  name: string;
  grade: string;
  board: string;
  timestamp: number;
  kind: "flash" | "sent" | "project";
  attempts: number;
  sessionCount: number;
}

type StatusFilter = "all" | "sent" | "project";

// ─── Constants ────────────────────────────────────────────────────────────────

const BAND_HEIGHT = 36;
const NARROW_QUERY = "(max-width: 639px)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;

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

const boardShort = (board: string) => BOARD_SHORT_NAMES[board as keyof typeof BOARD_SHORT_NAMES] ?? board;
const locationShort = (location: string) =>
  LOCATION_SHORT_NAMES[location as keyof typeof LOCATION_SHORT_NAMES] ?? location;

const chronological = (sessions: LogSession[]) => [...sessions].sort((a, b) => a.timestamp - b.timestamp);

function labelFor(session: LogSession, sorted: LogSession[]): SendLabel {
  const idx = sorted.findIndex((s) => s.id === session.id);
  return computeSessionLabel({
    sent: session.sent,
    attempts: session.attempts,
    sessionIndex: idx,
    priorSentInClimb: sorted.slice(0, idx).some((s) => s.sent),
  });
}

function flattenClimbs(climbs: LogClimb[]): SessionRow[] {
  return climbs
    .flatMap((climb) => {
      const sorted = chronological(climb.sessions);
      const climbSent = climb.sessions.some((s) => s.sent);
      return climb.sessions.map((session) => ({
        key: `${climb.id}-${session.id}`,
        climb,
        session,
        label: labelFor(session, sorted),
        climbSent,
      }));
    })
    .sort((a, b) => b.session.timestamp - a.session.timestamp);
}

function computeStats(climbs: LogClimb[]) {
  const sessions = climbs.flatMap((c) => c.sessions);
  const points: ChartPoint[] = climbs.map((climb) => {
    const sorted = chronological(climb.sessions);
    const sendIdx = sorted.findIndex((s) => s.sent);
    const isSent = sendIdx >= 0;
    const upToSend = isSent ? sorted.slice(0, sendIdx + 1) : sorted;
    return {
      id: climb.id,
      name: climb.name,
      grade: climb.grade,
      board: climb.board,
      timestamp: isSent ? sorted[sendIdx].timestamp : sorted[sorted.length - 1].timestamp,
      kind: !isSent ? "project" : sorted[0].sent && sorted[0].attempts === 1 ? "flash" : "sent",
      attempts: upToSend.reduce((n, s) => n + s.attempts, 0),
      sessionCount: upToSend.length,
    };
  });
  const sent = points.filter((p) => p.kind !== "project");
  const flashCount = points.filter((p) => p.kind === "flash").length;
  return {
    total: climbs.length,
    days: new Set(sessions.map((s) => dateKey(s.timestamp))).size,
    sentCount: sent.length,
    flashCount,
    flashRate: climbs.length ? flashCount / climbs.length : 0,
    avgAttempts: sent.length ? sent.reduce((n, p) => n + p.attempts, 0) / sent.length : 0,
    hardest: [...GRADES].reverse().find((g) => sent.some((p) => p.grade === g)),
    points,
  };
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function SendChart({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const narrow = useIsNarrow();
  const [hoverId, setHoverId] = useState<number | null>(null);
  const { points } = stats;

  const bandGrades = [...GRADES].reverse().filter((g) => points.some((p) => p.grade === g));
  const bandIndex = Object.fromEntries(bandGrades.map((g, i) => [g, i]));
  const tMin = Math.min(...points.map((p) => p.timestamp));
  const tMax = Math.max(...points.map((p) => p.timestamp));
  const span = Math.max(1, tMax - tMin);
  const xPct = (t: number) => 4 + ((t - tMin) / span) * 92;

  // Spread out dots that share a day and grade so they don't overlap.
  const counts: Record<string, number> = {};
  points.forEach((p) => {
    const k = dateKey(p.timestamp) + p.grade;
    counts[k] = (counts[k] ?? 0) + 1;
  });
  const seen: Record<string, number> = {};
  const dots = [...points]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((p) => {
      const k = dateKey(p.timestamp) + p.grade;
      const n = (seen[k] = (seen[k] ?? 0) + 1);
      const offset = (n - 1 - (counts[k] - 1) / 2) * (narrow ? 8 : 13);
      return { p, left: `max(7px, min(calc(${xPct(p.timestamp).toFixed(2)}% + ${offset}px), calc(100% - 7px)))` };
    });

  const months: { left: string; label: string }[] = [];
  const d = new Date(tMin * 1000);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; d.getTime() / 1000 <= tMax; i++, d.setMonth(d.getMonth() + 1)) {
    if (!narrow || i % 2 === 0) {
      months.push({
        left: `${xPct(d.getTime() / 1000).toFixed(2)}%`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
  }

  const hovered = points.find((p) => p.id === hoverId);
  const detail = hovered
    ? hovered.kind === "project"
      ? `Project · ${plural(hovered.attempts, "attempt")} over ${plural(hovered.sessionCount, "session")} · last tried ${shortDate(hovered.timestamp)}`
      : `${hovered.kind === "flash" ? "Flashed" : "Sent"} ${shortDate(hovered.timestamp)} · ${plural(hovered.attempts, "attempt")} over ${plural(hovered.sessionCount, "session")} · ${boardShort(hovered.board)}`
    : narrow
      ? "Tap a dot for details"
      : "Hover a dot for details";

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-3">
          <div className="flex flex-[0_0_64px] flex-col">
            {bandGrades.map((g) => (
              <div key={g} className="mono flex h-9 items-center gap-1.5 text-xs text-[#525252]">
                <span className="size-1.5 rounded-full" style={{ background: GRADE_COLORS[g] }} />
                {g}
              </div>
            ))}
          </div>
          <div className="relative min-w-0 flex-1" style={{ height: bandGrades.length * BAND_HEIGHT }}>
            {bandGrades.map((g, i) => (
              <div
                key={g}
                className="absolute inset-x-0 h-px bg-[#f0f0f0]"
                style={{ top: i * BAND_HEIGHT + BAND_HEIGHT / 2 }}
              />
            ))}
            {dots.map(({ p, left }) => (
              <div
                key={p.id}
                onMouseEnter={() => setHoverId(p.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => setHoverId(p.id)}
                className="absolute -mt-[5.5px] -ml-[5.5px] size-[11px] rounded-full transition-transform duration-[120ms]"
                style={{
                  left,
                  top: bandIndex[p.grade] * BAND_HEIGHT + BAND_HEIGHT / 2,
                  background: p.kind === "project" ? "#ffffff" : "#16a34a",
                  border: p.kind === "project" ? "1.5px solid #a3a3a3" : 0,
                  boxShadow: p.kind === "flash" ? "0 0 0 3px rgba(22,163,74,0.22)" : "none",
                  transform: hoverId === p.id ? "scale(1.5)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-[0_0_64px]" />
          <div className="relative h-4 min-w-0 flex-1 border-t border-[#e5e5e5]">
            {months.map((m) => (
              <span
                key={m.left}
                className="mono absolute top-1.5 text-[11px] whitespace-nowrap text-[#a3a3a3]"
                style={{ left: m.left }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 pt-1">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#525252]">
          <LegendItem
            label="Flash"
            count={stats.flashCount}
            style={{ background: "#16a34a", boxShadow: "0 0 0 3px rgba(22,163,74,0.22)" }}
          />
          <LegendItem label="Sent" count={stats.sentCount - stats.flashCount} style={{ background: "#16a34a" }} />
          <LegendItem
            label="Project"
            count={stats.total - stats.sentCount}
            style={{ border: "1.5px solid #a3a3a3" }}
          />
        </div>
        <div className="flex min-h-5 flex-col gap-0.5 text-[13px]">
          <span className="font-medium">
            {hovered ? `${hovered.name} · ${hovered.grade}` : "Every problem, by grade and date"}
          </span>
          <span className="text-[#737373]">{detail}</span>
        </div>
      </div>
    </>
  );
}

function LegendItem({ label, count, style }: { label: string; count: number; style: React.CSSProperties }) {
  return (
    <span className="flex items-center gap-[7px]">
      <span className="box-border size-[11px] rounded-full" style={style} />
      {label} <span className="mono text-[#a3a3a3]">{count}</span>
    </span>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface FilterOption {
  value: string;
  label: string;
  dot?: string;
  board?: string;
}

function FilterGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mono mr-0.5 text-[11px] tracking-[0.06em] text-[#a3a3a3] uppercase">{label}</span>
      {options.map((o) => {
        const active = selected === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active && o.value !== "all" ? "all" : o.value)}
            className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${
              active ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e5e5e5] bg-white text-[#404040]"
            }`}
          >
            {o.dot && <span className="size-1.5 rounded-full" style={{ background: o.dot }} />}
            {o.board && <BoardLogo board={o.board} inverted={active} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Session list ─────────────────────────────────────────────────────────────

function SessionRowView({
  row,
  expanded,
  notesOpen,
  onToggleExpanded,
  onToggleNotes,
}: {
  row: SessionRow;
  expanded: boolean;
  notesOpen: boolean;
  onToggleExpanded: () => void;
  onToggleNotes: () => void;
}) {
  const { climb, session } = row;
  const hasHistory = climb.sessions.length > 1;
  const chron = chronological(climb.sessions);
  const totalAttempts = chron.reduce((n, s) => n + s.attempts, 0);

  return (
    <div className={`flex flex-col rounded-[10px] ${expanded ? "bg-[#fafafa]" : ""}`}>
      <div
        onClick={hasHistory ? onToggleExpanded : undefined}
        className={`flex items-center gap-3 rounded-[10px] p-3 hover:bg-[#fafafa] ${hasHistory ? "cursor-pointer" : ""}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-medium">{climb.name}</span>
            {hasHistory && (
              <span className="mono shrink-0 rounded-full border border-[#e5e5e5] px-[7px] py-px text-[11px] text-[#737373]">
                {climb.sessions.length}×
              </span>
            )}
            {session.notes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNotes();
                }}
                className="shrink-0 cursor-pointer text-xs text-[#737373] underline underline-offset-2"
              >
                {notesOpen ? "Hide note" : "Note"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-[#737373]">
            <GradeTag grade={climb.grade} />
            <span className="flex items-center gap-1.5">
              <BoardLogo board={climb.board} />
              {boardShort(climb.board)}
            </span>
            <span>{session.incline}°</span>
            <span>{plural(session.attempts, "attempt")}</span>
          </div>
          {notesOpen && (
            <p className="mt-1 text-sm leading-normal whitespace-pre-wrap text-[#404040]">{session.notes}</p>
          )}
        </div>
        <SendLabelPill label={row.label} />
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5 px-3 pb-3">
          <span className="pb-1.5 text-xs text-[#737373]">
            {plural(chron.length, "session")} · {plural(totalAttempts, "total attempt")} ·{" "}
            {row.climbSent ? "Sent" : "Project"}
          </span>
          {[...chron].reverse().map((s) => {
            const lb = labelFor(s, chron);
            const active = s.id === session.id;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] ${
                  active ? "bg-[#f0f0f0]" : ""
                }`}
              >
                <span className={`mono text-xs ${active ? "font-semibold" : ""}`}>{shortDate(s.timestamp)}</span>
                <span className="flex items-center gap-3.5 text-[#737373]">
                  <span>{plural(s.attempts, "attempt")}</span>
                  <span
                    className="w-[72px] text-right font-semibold"
                    style={{ color: lb === "Flash" ? "#16a34a" : LABEL_STYLES[lb].color }}
                  >
                    {lb}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClimbingLogView({ climbs }: { climbs: LogClimb[] | null }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [grade, setGrade] = useState("all");
  const [board, setBoard] = useState("all");
  const [gym, setGym] = useState("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState<string | null>(null);

  const allRows = useMemo(() => (climbs ? flattenClimbs(climbs) : []), [climbs]);
  const stats = useMemo(() => (climbs && climbs.length ? computeStats(climbs) : null), [climbs]);

  const rows = allRows.filter(
    (r) =>
      (grade === "all" || r.climb.grade === grade) &&
      (board === "all" || r.climb.board === board) &&
      (gym === "all" || r.session.location === gym) &&
      (status === "all" || (status === "sent") === r.climbSent),
  );

  const groups: [string, SessionRow[]][] = [];
  for (const row of rows) {
    const k = dateKey(row.session.timestamp);
    const last = groups[groups.length - 1];
    if (last && last[0] === k) last[1].push(row);
    else groups.push([k, [row]]);
  }
  const yearOf = (rs: SessionRow[]) => new Date(rs[0].session.timestamp * 1000).getFullYear();

  const anyFilter = status !== "all" || grade !== "all" || board !== "all" || gym !== "all";
  const withReset = (set: (v: string) => void) => (v: string) => {
    set(v);
    setExpandedKey(null);
  };
  const clearFilters = () => {
    setStatus("all");
    setGrade("all");
    setBoard("all");
    setGym("all");
    setExpandedKey(null);
  };

  const all = climbs ?? [];
  const gradesIn = GRADES.filter((g) => all.some((c) => c.grade === g));
  const boardsIn = BOARDS.filter((b) => all.some((c) => c.board === b));
  const gymsIn = LOCATIONS.filter((l) => all.some((c) => c.sessions.some((s) => s.location === l)));

  const summary = climbs === null ? "Unavailable right now." : stats ? `${plural(stats.total, "problem")} · ${plural(stats.days, "session")}` : "";

  return (
    <SiteChrome>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-14 px-6 pt-[72px] pb-16">
        <div className="reveal flex flex-col gap-3.5">
          <span className="mono text-[13px] text-[#737373]">{summary}</span>
          <h1 className="m-0 text-[clamp(40px,10vw,56px)] leading-none font-semibold tracking-[-0.04em]">
            Climbing log
          </h1>
        </div>

        {stats && (
          <section
            className="reveal flex flex-col gap-7 border-t border-[#0a0a0a] pt-7"
            style={{ animationDelay: "120ms" }}
          >
            <p className="max-w-[820px] text-[clamp(21px,5vw,28px)] leading-[1.35] font-medium tracking-[-0.025em] text-pretty text-[#a3a3a3]">
              <span className="text-[#0a0a0a]">
                {stats.sentCount} of {stats.total} problems sent
              </span>{" "}
              over {stats.days} days on the wall. Hardest send{" "}
              <span style={{ color: (stats.hardest && GRADE_COLORS[stats.hardest]) || "#0a0a0a" }}>
                {stats.hardest ?? "—"}
              </span>
              , <span className="text-[#0a0a0a]">{Math.round(stats.flashRate * 100)}% flashed</span>,{" "}
              {stats.avgAttempts > 0 ? stats.avgAttempts.toFixed(1) : "—"} attempts per send on average.
            </p>
            <SendChart stats={stats} />
          </section>
        )}

        <section className="reveal flex flex-col" style={{ animationDelay: "320ms" }}>
          <div className="top-16 z-[5] flex flex-col gap-2.5 border-b border-[#0a0a0a] bg-white pt-4 pb-3.5 sm:sticky">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Sessions</h2>
              {climbs && (
                <span className="flex items-center gap-3 text-[13px] text-[#737373]">
                  <span>
                    {plural(new Set(rows.map((r) => dateKey(r.session.timestamp))).size, "session")} ·{" "}
                    {plural(rows.length, "climb")}
                  </span>
                  {anyFilter && (
                    <button type="button" onClick={clearFilters} className="cursor-pointer text-[#0a0a0a] underline">
                      Clear
                    </button>
                  )}
                </span>
              )}
            </div>
            {climbs && (
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <FilterGroup
                  label="Status"
                  selected={status}
                  onSelect={withReset((v) => setStatus(v as StatusFilter))}
                  options={[
                    { value: "all", label: "All" },
                    { value: "sent", label: "Sent" },
                    { value: "project", label: "Project" },
                  ]}
                />
                <FilterGroup
                  label="Grade"
                  selected={grade}
                  onSelect={withReset(setGrade)}
                  options={[
                    { value: "all", label: "All" },
                    ...gradesIn.map((g) => ({ value: g, label: g, dot: GRADE_COLORS[g] })),
                  ]}
                />
                {boardsIn.length > 1 && (
                  <FilterGroup
                    label="Board"
                    selected={board}
                    onSelect={withReset(setBoard)}
                    options={[{ value: "all", label: "All" }, ...boardsIn.map((b) => ({ value: b, label: boardShort(b), board: b }))]}
                  />
                )}
                {gymsIn.length > 1 && (
                  <FilterGroup
                    label="Gym"
                    selected={gym}
                    onSelect={withReset(setGym)}
                    options={[{ value: "all", label: "All" }, ...gymsIn.map((l) => ({ value: l, label: locationShort(l) }))]}
                  />
                )}
              </div>
            )}
          </div>

          {groups.length === 0 && (
            <p className="py-16 text-center text-sm text-[#a3a3a3]">
              {climbs === null ? "Unavailable right now." : "No sessions match the current filters."}
            </p>
          )}

          {groups.map(([k, rs], gi) => {
            const showYear = gi === groups.length - 1 || yearOf(groups[gi + 1][1]) !== yearOf(rs);
            return (
              <div key={k}>
                <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-[#f0f0f0] py-6">
                  <div className="flex flex-[0_0_150px] flex-col gap-1 pt-3">
                    <span className="text-[15px] font-semibold tracking-[-0.01em]">{shortDate(rs[0].session.timestamp)}</span>
                    <span className="mono text-xs whitespace-nowrap text-[#737373]">
                      {locationShort(rs[0].session.location)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-[1_1_480px] flex-col">
                    {rs.map((r) => (
                      <SessionRowView
                        key={r.key}
                        row={r}
                        expanded={expandedKey === r.key}
                        notesOpen={notesKey === r.key}
                        onToggleExpanded={() => setExpandedKey(expandedKey === r.key ? null : r.key)}
                        onToggleNotes={() => setNotesKey(notesKey === r.key ? null : r.key)}
                      />
                    ))}
                  </div>
                </div>
                {showYear && (
                  <div className="flex items-center gap-3.5 pt-7 pb-1">
                    <span className="text-[15px] font-semibold tracking-[-0.01em]">{yearOf(rs)}</span>
                    <span className="h-px flex-1 bg-[#e5e5e5]" />
                  </div>
                )}
              </div>
            );
          })}
          {climbs && (
            <p className="mt-12 text-center text-xs text-[#a3a3a3]">You&apos;ve reached the bottom. More sends coming soon.</p>
          )}
        </section>
      </main>
    </SiteChrome>
  );
}
