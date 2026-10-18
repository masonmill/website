import type { SendLabel } from "@/lib/climbingLog/climbingLog";

// Visual vocabulary shared by the public /climbing page and the editor.

export const GRADE_COLORS: Record<string, string> = {
  "4c/V0": "#16a34a",
  "5a/V1": "#0d9488",
  "5b/V1": "#0891b2",
  "5c/V2": "#0284c7",
  "6a/V3": "#2563eb",
  "6a+/V3": "#4f46e5",
  "6b/V4": "#7c3aed",
  "6b+/V4": "#9333ea",
  "6c/V5": "#c026d3",
  "6c+/V5": "#db2777",
  "7a/V6": "#e11d48",
  "7a+/V7": "#dc2626",
};

export const LABEL_STYLES: Record<SendLabel, { color: string; bg: string; border: string }> = {
  Flash: { color: "#ffffff", bg: "#16a34a", border: "#16a34a" },
  "Day flash": { color: "#16a34a", bg: "transparent", border: "transparent" },
  Sent: { color: "#16a34a", bg: "transparent", border: "#16a34a" },
  Repeat: { color: "#2563eb", bg: "transparent", border: "#2563eb" },
  Project: { color: "#a3a3a3", bg: "transparent", border: "transparent" },
};

// Brand marks shown beside board names; boards without one show text only.
const BOARD_LOGOS: Record<string, string> = {
  "MoonBoard 2019": "/boards/moonboard.png",
  "MoonBoard 2024": "/boards/moonboard.png",
  "Tension Board 2 Spray": "/boards/tension.png",
};

export function BoardLogo({ board, inverted = false }: { board: string; inverted?: boolean }) {
  const src = BOARD_LOGOS[board];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static icon; next/image adds nothing here
    <img src={src} alt="" width={14} height={14} className={`size-3.5 shrink-0 object-contain ${inverted ? "invert" : ""}`} />
  );
}

// Gym marks shown beside location names, keyed by full location name.
const GYM_LOGOS: Record<string, string> = {
  "Planet Rock Ann Arbor": "/gyms/planet-rock.png",
  "Movement Long Island City": "/gyms/movement.png",
};

export function GymLogo({ location }: { location: string }) {
  const src = GYM_LOGOS[location];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static icon; next/image adds nothing here
    <img src={src} alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" />
  );
}

export function GradeTag({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade] ?? "#525252";
  // Fixed width (longest grade is 6 chars) keeps whatever follows aligned across rows.
  return (
    <span className="mono flex min-w-[calc(6ch+12px)] items-center gap-1.5 text-xs" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {grade}
    </span>
  );
}

// Board, incline and label get fixed widths too, so every column in a row's
// metadata lines up across rows, within a day and across days.
export function BoardTag({ board, short }: { board: string; short: string }) {
  return (
    <span className="flex min-w-[88px] items-center gap-1.5">
      <BoardLogo board={board} />
      {short}
    </span>
  );
}

export function InclineTag({ incline }: { incline: number }) {
  return <span className="min-w-[28px] tabular-nums">{incline}°</span>;
}

export function SendLabelPill({ label }: { label: SendLabel }) {
  const s = LABEL_STYLES[label];
  return (
    <span
      className="flex w-20 shrink-0 justify-center rounded-full border py-[3px] text-xs font-semibold"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {label}
    </span>
  );
}
