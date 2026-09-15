"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getLocalDateIso,
  listBackdateDates,
  type LocalDateIso,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { type HabitKind } from "./manage/types";

export type Habit = {
  id: string;
  name: string;
  kind: HabitKind;
  target_per_week: number;
};

type HabitCardProps = {
  habit: Habit;
  initialIsCompletedToday: boolean;
  initialWeeklyCompletionCount: number;
  completedOnDates: string[];
  isResting: boolean;
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
  isResting,
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
  const [backdateNotice, setBackdateNotice] = useState<string | null>(null);

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

    // Write order keeps every mid-pair failure recoverable from Today: the
    // completion row is written while ACTIVE state brackets it (insert before
    // archiving, un-archive before deleting). The reverse un-tap order could
    // strand a task archived with zero completion rows — invisible to both of
    // Today's queries and restorable nowhere in the UI.
    if (habit.kind === "task" && !nextIsCompletedToday) {
      const { error: unarchiveError } = await supabase
        .from("habits")
        .update({ is_archived: false })
        .eq("id", habit.id);

      if (unarchiveError) {
        console.error("Supabase task unarchive failed", {
          habitId: habit.id,
          code: unarchiveError.code,
          message: unarchiveError.message,
        });
        setIsCompletedToday(previousIsCompletedToday);
        setWeeklyCompletionCount(previousWeeklyCompletionCount);
        onTodayCompletionChange(-delta);
        setSyncError("SYNC FAILED - RETRY");
        setIsSyncing(false);
        return;
      }
    }

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

    // Unique violation = the row already exists (race or stale view): the optimistic
    // "complete" state is already truth, so skip the revert and just resync.
    const isDuplicateInsert =
      nextIsCompletedToday && error?.code === uniqueViolationCode;

    if (error && !isDuplicateInsert) {
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

    // A task is done once: completing archives it, un-completing un-archives
    // (above, before the delete), so a same-day mis-tap stays recoverable
    // (issue #9).
    if (habit.kind === "task" && nextIsCompletedToday) {
      const { error: archiveError } = await supabase
        .from("habits")
        .update({ is_archived: true })
        .eq("id", habit.id);

      if (archiveError) {
        // The completion row already changed, so the checked state is truth;
        // surface the half-applied pair instead of reverting over it.
        console.error("Supabase task archive toggle failed", {
          habitId: habit.id,
          isArchived: true,
          code: archiveError.code,
          message: archiveError.message,
        });
        setSyncError("SYNC FAILED - RETRY");
        setIsSyncing(false);
        return;
      }
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

    // A backdated task was done on that day — it clears immediately (the
    // deliberate two-step gesture doesn't need the mis-tap grace window).
    if (habit.kind === "task") {
      const { error: archiveError } = await supabase
        .from("habits")
        .update({ is_archived: true })
        .eq("id", habit.id);

      if (archiveError) {
        console.error("Supabase backdated task archive failed", {
          habitId: habit.id,
          completedOn,
          code: archiveError.code,
          message: archiveError.message,
        });
        setSyncError("SYNC FAILED - RETRY");
        setIsSyncing(false);
        return;
      }

      // A beat of feedback before the refresh clears the card (issue #15):
      // without it, the first-ever backdate reads as the task vanishing
      // unexplained. isSyncing stays true so nothing else fires meanwhile.
      setIsBackdateOpen(false);
      setBackdateNotice("LOGGED - ARCHIVED");
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // Cleared explicitly: a card that survives the refresh (task already
      // completed today, #14) would otherwise wear the notice forever.
      setBackdateNotice(null);
    }

    setIsBackdateOpen(false);
    setIsSyncing(false);
    startTransition(() => router.refresh());
  }

  const completedSegmentCount = Math.min(
    weeklyCompletionCount,
    habit.target_per_week,
  );
  // A weekly habit never renders past its target ("2/1"); daily overshoot
  // stays honest — beating the quota is a win, not a glitch (issue #13).
  const displayedWeeklyCount =
    habit.kind === "weekly" ? completedSegmentCount : weeklyCompletionCount;
  const cardShellClassName = [
    "relative flex min-h-11 w-full overflow-hidden rounded-[4px] transition-colors duration-300",
    isResting
      ? "border border-white/[0.06] bg-white/[0.02] opacity-55"
      : isCompletedToday
        ? "border border-cyan/20 bg-cyan/[0.04] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-cyan)_8%,transparent),transparent_60%)] before:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-cyan after:content-['']"
        : "border border-white/[0.06] bg-white/[0.02]",
  ].join(" ");
  const backdateDates = listBackdateDates(new Date());

  return (
    <div className="relative">
      <div className={cardShellClassName}>
        <button
          aria-pressed={isCompletedToday}
          className="relative min-w-0 flex-1 px-[14px] py-3 text-left transition-colors duration-300 active:bg-white/[0.03]"
          disabled={isSyncing || isResting}
          onClick={toggleCompletion}
          type="button"
        >
          {isResting ? null : (
            <span
              className={[
                "absolute right-[14px] top-3 z-10 flex h-[18px] w-[18px] items-center justify-center font-rajdhani text-[14px] font-bold leading-none transition-colors duration-300",
                isCompletedToday
                  ? "border-2 border-cyan bg-cyan/15 text-cyan"
                  : "border border-white/15 text-transparent",
              ].join(" ")}
              aria-hidden="true"
            >
              {isCompletedToday ? "✓" : null}
            </span>
          )}
          <span className="relative z-10 block min-w-0 pr-8">
            <span
              className={[
                "block truncate font-rajdhani text-base font-bold uppercase tracking-[0.5px] transition-colors duration-300",
                isCompletedToday ? "text-white" : "text-text-dim",
              ].join(" ")}
            >
              {habit.name}
            </span>
            <span
              className={[
                "mt-1 flex items-center gap-3 font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] transition-colors duration-300",
                isCompletedToday ? "text-cyan/70" : "text-text-muted",
              ].join(" ")}
            >
              {habit.kind === "task" ? (
                <span>ONE-OFF</span>
              ) : isResting ? (
                <span className="text-cyan/60">DONE FOR THIS WEEK</span>
              ) : (
                <span>
                  {/* Daily reads as quiet progress ("days this week"); weekly
                      reads as the target it is (issue #13). */}
                  {habit.kind === "daily" ? "THIS WEEK" : "WEEKLY"}{" "}
                  {displayedWeeklyCount}/{habit.target_per_week}
                </span>
              )}
            </span>
          </span>
          {habit.kind === "task" ? null : (
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
                    index < completedSegmentCount
                      ? // The daily bar is progress, not a demand — it sits dimmer
                        // than the checkbox so "done today" stays the hero.
                        habit.kind === "daily"
                        ? "bg-cyan/40"
                        : "bg-cyan"
                      : "bg-white/10"
                  }
                />
              ))}
            </span>
          )}
          {syncError ? (
            <span className="relative z-10 mt-2 block truncate font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-error">
              {syncError}
            </span>
          ) : null}
          {backdateNotice ? (
            <span className="relative z-10 mt-2 block truncate font-rajdhani text-[11px] font-semibold uppercase tracking-[0.5px] text-cyan">
              {backdateNotice}
            </span>
          ) : null}
        </button>
        <button
          aria-expanded={isBackdateOpen}
          aria-label="LOG A PAST DAY"
          className={[
            "relative z-10 flex w-9 shrink-0 flex-col items-center justify-center gap-1 border-l",
            isBackdateOpen
              ? "border-cyan/20 bg-cyan/10 text-cyan"
              : "border-white/[0.06] text-text-muted transition hover:text-cyan",
          ].join(" ")}
          disabled={isSyncing || isResting}
          onClick={() => setIsBackdateOpen(!isBackdateOpen)}
          type="button"
        >
          {/* Drawn icon, not a unicode glyph: ⟲ falls back to an emoji face on
              some Android system fonts and breaks the HUD. */}
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="square"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polyline points="2 4 2 10 8 10" />
            <path d="M4.5 15a9 9 0 1 0 2.1-9.4L2 10" />
          </svg>
          {/* The glyph alone was undiscoverable (issue #15) — a quiet visible
              label so the control is legible before the first tap. */}
          <span className="font-orbitron text-[8px] font-bold leading-none tracking-[1px]">
            PAST
          </span>
        </button>
      </div>
      {isBackdateOpen ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-[4px] border border-cyan/20 bg-ground p-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
          <p className="px-2 py-1.5 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-text-muted">
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
