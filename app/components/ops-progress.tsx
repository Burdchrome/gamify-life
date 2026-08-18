export function OpsProgress({
  completedCount,
  habitCount,
}: {
  completedCount: number;
  habitCount: number;
}) {
  if (habitCount === 0) {
    return null;
  }

  const filledSegmentCount = Math.min(completedCount, habitCount);

  return (
    <div className="mt-4">
      <div
        className="grid h-[3px] gap-0.5"
        style={{ gridTemplateColumns: `repeat(${habitCount}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: habitCount }, (_, index) => (
          <span
            key={index}
            className={index < filledSegmentCount ? "bg-cyan" : "bg-white/10"}
          />
        ))}
      </div>
      <p className="mt-2 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted">
        {completedCount}/{habitCount} OPS COMPLETE
      </p>
    </div>
  );
}
