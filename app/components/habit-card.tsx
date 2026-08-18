"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getLocalDateIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

export type Habit = {
  id: string;
  name: string;
  target_per_week: number;
};

type HabitCardProps = {
  habit: Habit;
  initialIsCompletedToday: boolean;
  initialWeeklyCompletionCount: number;
  onTodayCompletionChange: (delta: number) => void;
};

const uniqueViolationCode = "23505";

export function HabitCard({
  habit,
  initialIsCompletedToday,
  initialWeeklyCompletionCount,
  onTodayCompletionChange,
}: HabitCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isCompletedToday, setIsCompletedToday] = useState(
    initialIsCompletedToday,
  );
  const [weeklyCompletionCount, setWeeklyCompletionCount] = useState(
    initialWeeklyCompletionCount,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function toggleCompletion() {
    if (isSyncing) {
      return;
    }

    const completedOn = getLocalDateIso(new Date());
    const nextIsCompletedToday = !isCompletedToday;
    const previousIsCompletedToday = isCompletedToday;
    const previousWeeklyCompletionCount = weeklyCompletionCount;
    const delta = nextIsCompletedToday ? 1 : -1;

    setSyncError(null);
    setIsSyncing(true);
    setIsCompletedToday(nextIsCompletedToday);
    setWeeklyCompletionCount(Math.max(0, weeklyCompletionCount + delta));
    onTodayCompletionChange(delta);

    const supabase = createClient();
    const { error } = nextIsCompletedToday
      ? await supabase.from("completions").insert({
          habit_id: habit.id,
          completed_on: completedOn,
        })
      : await supabase
          .from("completions")
          .delete()
          .eq("habit_id", habit.id)
          .eq("completed_on", completedOn);

    if (error) {
      // Unique violation = the row already exists (race or stale view): the optimistic
      // "complete" state is already truth, so skip the revert and just resync.
      if (nextIsCompletedToday && error.code === uniqueViolationCode) {
        setIsSyncing(false);
        startTransition(() => router.refresh());
        return;
      }

      console.error("Supabase completion toggle failed", {
        action: nextIsCompletedToday ? "insert" : "delete",
        habitId: habit.id,
        completedOn,
        code: error.code,
        message: error.message,
      });
      setIsCompletedToday(previousIsCompletedToday);
      setWeeklyCompletionCount(previousWeeklyCompletionCount);
      onTodayCompletionChange(-delta);
      setSyncError("SYNC FAILED - RETRY");
      setIsSyncing(false);
      return;
    }

    setIsSyncing(false);
    startTransition(() => router.refresh());
  }

  const completedSegmentCount = Math.min(
    weeklyCompletionCount,
    habit.target_per_week,
  );
  const cardClassName = [
    "relative block min-h-11 w-full overflow-hidden rounded-[4px] px-[14px] py-3 text-left",
    isCompletedToday
      ? "border border-cyan/20 bg-cyan/[0.04] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-cyan)_8%,transparent),transparent_60%)] before:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-cyan after:content-['']"
      : "border border-white/[0.06] bg-white/[0.02]",
  ].join(" ");

  return (
    <button
      aria-pressed={isCompletedToday}
      className={cardClassName}
      disabled={isSyncing}
      onClick={toggleCompletion}
      type="button"
    >
      <span
        className={[
          "absolute right-[14px] top-3 z-10 flex h-[18px] w-[18px] items-center justify-center font-rajdhani text-[14px] font-bold leading-none",
          isCompletedToday
            ? "border-2 border-cyan bg-cyan/15 text-cyan"
            : "border border-white/15 text-transparent",
        ].join(" ")}
        aria-hidden="true"
      >
        {isCompletedToday ? "✓" : null}
      </span>
      <span className="relative z-10 block min-w-0 pr-8">
        <span
          className={[
            "block truncate font-rajdhani text-base font-bold uppercase tracking-[0.5px]",
            isCompletedToday ? "text-white" : "text-text-dim",
          ].join(" ")}
        >
          {habit.name}
        </span>
        <span
          className={[
            "mt-1 flex items-center gap-3 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px]",
            isCompletedToday ? "text-cyan/70" : "text-text-muted",
          ].join(" ")}
        >
          <span>
            WEEKLY {weeklyCompletionCount}/{habit.target_per_week}
          </span>
          {/* Streaks need multi-day history and stay zero until that loop. */}
          <span>STREAK 0</span>
        </span>
      </span>
      <span
        className="relative z-10 mt-3 grid h-[3px] gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${habit.target_per_week}, minmax(0, 1fr))`,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: habit.target_per_week }, (_, index) => (
          <span
            key={index}
            className={index < completedSegmentCount ? "bg-cyan" : "bg-white/10"}
          />
        ))}
      </span>
      {syncError ? (
        <span className="relative z-10 mt-2 block truncate font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-error">
          {syncError}
        </span>
      ) : null}
    </button>
  );
}
