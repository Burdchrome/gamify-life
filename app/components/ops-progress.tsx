// Header ops bar (design-language §Header Chrome). Filled segments and a live
// complete-count arrive with completions in ticket #5.
export function OpsProgress({ habitCount }: { habitCount: number }) {
  if (habitCount === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div
        className="grid h-[3px] gap-0.5"
        style={{ gridTemplateColumns: `repeat(${habitCount}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: habitCount }, (_, index) => (
          <span key={index} className="bg-white/10" />
        ))}
      </div>
      <p className="mt-2 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted">
        0/{habitCount} OPS COMPLETE
      </p>
    </div>
  );
}
