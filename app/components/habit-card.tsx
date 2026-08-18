export type Habit = {
  id: string;
  name: string;
  target_per_week: number;
};

// Incomplete-state rendering only: WEEKLY/STREAK zeros, empty bar segments, and
// the static checkbox fill with real completion data in ticket #5.
export function HabitCard({ habit }: { habit: Habit }) {
  return (
    <article className="relative min-h-11 rounded-[4px] border border-white/[0.06] bg-white/[0.02] px-[14px] py-3">
      <span
        className="absolute right-[14px] top-3 h-[18px] w-[18px] border border-white/15"
        aria-hidden="true"
      />
      <div className="min-w-0 pr-8">
        <h2 className="truncate font-rajdhani text-base font-bold uppercase tracking-[0.5px] text-text-dim">
          {habit.name}
        </h2>
        <div className="mt-1 flex items-center gap-3 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted">
          <span>WEEKLY 0/{habit.target_per_week}</span>
          <span>STREAK 0</span>
        </div>
      </div>
      <div
        className="mt-3 grid h-[3px] gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${habit.target_per_week}, minmax(0, 1fr))`,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: habit.target_per_week }, (_, index) => (
          <span key={index} className="bg-white/10" />
        ))}
      </div>
    </article>
  );
}
