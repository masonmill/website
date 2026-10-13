import type { SendLabel } from "@/lib/climbingLog/climbingLog";

// Visual vocabulary shared by the public /climbing page and the editor.

export const GRADE_COLORS: Record<string, string> = {
  "6a+/V3": "#15803d",
  "6b/V4": "#1d4ed8",
  "6b+/V4": "#1d4ed8",
  "6c/V5": "#c2410c",
  "6c+/V5": "#c2410c",
  "7a/V6": "#b91c1c",
  "7a+/V7": "#7e22ce",
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

export function SendLabelPill({ label }: { label: SendLabel }) {
  const s = LABEL_STYLES[label];
  return (
    <span
      className="shrink-0 rounded-full border px-2.5 py-[3px] text-xs font-semibold"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {label}
    </span>
  );
}
