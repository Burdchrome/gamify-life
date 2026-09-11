"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getLocalDateIso,
  listBackdateDates,
  type LocalDateIso,
} from "@/lib/dates";
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
  completedOnDates: string[];
  onTodayCompletionChange: (delta: number) => void;
};

const uniqueViolationCode = "23505";
const weekdayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function formatBackdateLabel(date: LocalDateIso, isYesterday: boolean): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = weekdayLabels[new Date(year, month - 1, day).getDay()];

  return isYesterday ? `${weekday} ${month}/${day} - YESTERDAY` : `${weekday} ${month}/${day}`;
}

export function HabitCard({
  habit,
  initialIsCompletedToday,
  initialWeeklyCompletionCount,
  completedOnDates,
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
  const [isBackdateOpen, setIsBackdateOpen] = useState(false);
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

  async function logPastCompletion(completedOn: LocalDateIso) {
    if (isSyncing) {
      return;
    }

    setSyncError(null);
    setIsSyncing(true);

    const supabase = createClient();
    const { error } = await supabase.from("completions").insert({
      habit_id: habit.id,
      completed_on: completedOn,
    });

    // Unique violation = that day is already logged (race with another device):
    // the desired state already holds, so a resync is the whole fix.
    if (error && error.code !== uniqueViolationCode) {
      console.error("Supabase backdated completion failed", {
        habitId: habit.id,
        completedOn,
        code: error.code,
        message: error.message,
      });
      setSyncError("SYNC FAILED - RETRY");
      setIsSyncing(false);
      return;
    }

    setIsBackdateOpen(false);
    setIsSyncing(false);
    startTransition(() => router.refresh());
  }

  const completedSegmentCount = Math.min(
    weeklyCompletionCount,
    habit.target_per_week,
  );
  const cardShellClassName = [
    "relative flex min-h-11 w-full overflow-hidden rounded-[4px]",
    isCompletedToday
      ? "border border-cyan/20 bg-cyan/[0.04] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-cyan)_8%,transparent),transparent_60%)] before:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-cyan after:content-['']"
      : "border border-white/[0.06] bg-white/[0.02]",
  ].join(" ");
  const backdateDates = listBackdateDates(new Date());

  return (
    <div className="relative">
      <div className={cardShellClassName}>
        <button
          aria-pressed={isCompletedToday}
          className="relative min-w-0 flex-1 px-[14px] py-3 text-left"
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
                className={
                  index < completedSegmentCount ? "bg-cyan" : "bg-white/10"
                }
              />
            ))}
          </span>
          {syncError ? (
            <span className="relative z-10 mt-2 block truncate font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-error">
              {syncError}
            </span>
          ) : null}
        </button>
        <button
          aria-expanded={isBackdateOpen}
          aria-label="LOG A PAST DAY"
          className={[
            "relative z-10 flex w-9 shrink-0 items-center justify-center border-l font-rajdhani text-[14px] font-bold",
            isBackdateOpen
              ? "border-cyan/20 bg-cyan/10 text-cyan"
              : "border-white/[0.06] text-text-muted transition hover:text-cyan",
          ].join(" ")}
          disabled={isSyncing}
          onClick={() => setIsBackdateOpen(!isBackdateOpen)}
          type="button"
        >
          ⟲
        </button>
      </div>
      {isBackdateOpen ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-[4px] border border-cyan/20 bg-ground p-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
          <p className="px-2 py-1.5 font-rajdhani text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">
            LOG AS DONE ON
          </p>
          {backdateDates.map((date, index) => {
            const isAlreadyLogged = completedOnDates.includes(date);

            return (
              <button
                key={date}
                className="flex min-h-11 w-full items-center justify-between px-2 font-rajdhani text-[12px] font-semibold uppercase tracking-[0.5px] text-text-dim transition hover:bg-cyan/10 hover:text-cyan disabled:text-text-muted disabled:hover:bg-transparent"
                data-testid="backdate-day"
                disabled={isAlreadyLogged || isSyncing}
                onClick={() => logPastCompletion(date)}
                type="button"
              >
                <span>{formatBackdateLabel(date, index === 0)}</span>
                {isAlreadyLogged ? <span className="text-cyan">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
