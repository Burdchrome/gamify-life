import { type ManageHabit } from "./types";

type ArchivedHabitsSectionProps = {
  habits: ManageHabit[];
};

export function ArchivedHabitsSection({ habits }: ArchivedHabitsSectionProps) {
  if (habits.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Archived protocols"
      className="border-t border-cyan-divider pt-4 opacity-65"
    >
      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[3px] text-text-muted">
        ARCHIVED PROTOCOLS
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {habits.map((habit) => (
          <li
            aria-label={"Archived protocol " + habit.name}
            className="flex min-h-11 items-center justify-between gap-3 rounded-[4px] border border-white/[0.06] bg-white/[0.02] px-[14px] py-2"
            key={habit.id}
          >
            <span className="min-w-0 truncate font-rajdhani text-base font-bold uppercase tracking-[0.5px] text-text-dim">
              {habit.name}
            </span>
            <span className="shrink-0 rounded-[4px] border border-cyan-divider px-2 py-1 font-orbitron text-[8px] font-bold uppercase tracking-[2px] text-text-muted">
              ARCHIVED
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
