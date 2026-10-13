// Shared editor building blocks, matching the public site's look.

export const primaryButton =
  "flex h-10 cursor-pointer items-center gap-2 rounded-full bg-[#0a0a0a] px-4 text-sm font-medium text-white hover:bg-[#262626] disabled:cursor-default disabled:opacity-50";
export const secondaryButton =
  "flex h-10 cursor-pointer items-center rounded-full border border-[#e5e5e5] bg-white px-4 text-sm font-medium hover:border-[#a3a3a3] disabled:cursor-default disabled:opacity-50";
export const dangerButton =
  "flex h-10 cursor-pointer items-center rounded-full bg-[#dc2626] px-[18px] text-sm font-medium text-white hover:bg-[#b91c1c] disabled:cursor-default disabled:opacity-50";
export const iconButton =
  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#a3a3a3] hover:bg-[#f0f0f0] hover:text-[#0a0a0a]";
export const inputClass =
  "h-10 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-[15px] focus:border-[#0a0a0a] focus:outline-none disabled:bg-[#fafafa] disabled:text-[#737373]";
export const textareaClass =
  "resize-y rounded-[10px] border border-[#e5e5e5] px-3 py-2.5 text-[15px] focus:border-[#0a0a0a] focus:outline-none";

export function Dialog({ children, className = "max-w-[480px]" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,10,10,0.35)] p-4">
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-2xl bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mono text-[11px] font-medium tracking-[0.06em] text-[#a3a3a3] uppercase">{children}</h3>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="flex justify-between text-[13px] font-medium text-[#525252]">{children}</span>;
}

export function Chip({
  active,
  onClick,
  disabled,
  activeColor = "#0a0a0a",
  className = "",
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  activeColor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-medium disabled:cursor-default ${
        active ? "text-white" : "border-[#e5e5e5] bg-white text-[#404040] disabled:opacity-50"
      } ${className}`}
      style={active ? { background: activeColor, borderColor: activeColor } : undefined}
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-[#dc2626]" role="alert">
      {children}
    </p>
  );
}
