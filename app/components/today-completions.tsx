"use client";

import { useState, useSyncExternalStore } from "react";
import {
  countCompletionsThisWeek,
  getLocalDateIso,
  getWeekBounds,
} from "@/lib/dates";
import { isRestingWeekly } from "@/lib/habit-status";
import { HabitCard, type Habit } from "./habit-card";
import { OpsProgress } from "./ops-progress";

export type TodayHabit = Habit & {
  completedOnDates: string[];
};

type DerivedTodayHabit = Habit & {
  isCompletedToday: boolean;
  weeklyCompletionCount: number;
  completedOnDates: string[];
  isResting: boolean;
};

type TodayCompletionsProps = {
  habits: TodayHabit[];
};

const subscribeToNothing = () => () => {};

export function TodayCompletions({ habits }: TodayCompletionsProps) {
  // "Today" belongs to the DEVICE clock alone (issue #8: the server renders in
  // UTC and can sit on the wrong calendar day). Derivation waits for hydration
  // so the server pass never interprets the dates — same tradeoff
  // local-date.tsx makes for the header date.
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!isHydrated) {
    return null;
  }

  const deviceNow = new Date();
  const today = getLocalDateIso(deviceNow);
  const weekBounds = getWeekBounds(deviceNow);
  const derivedHabits = habits.map<DerivedTodayHabit>((habit) => {
    const isCompletedToday = habit.completedOnDates.includes(today);
    const weeklyCompletionCount = countCompletionsThisWeek(
      habit.completedOnDates,
      weekBounds,
      today,
    );

    return {
      id: habit.id,
      name: habit.name,
      kind: habit.kind,
      target_per_week: habit.target_per_week,
      isCompletedToday,
      weeklyCompletionCount,
      completedOnDates: habit.completedOnDates,
      isResting: isRestingWeekly({
        kind: habit.kind,
        weeklyCompletionCount,
        targetPerWeek: habit.target_per_week,
        isCompletedToday,
      }),
    };
  });
  // Resting weekly habits met their target on earlier days: they render, but
  // they are not today's ops (issue #13).
  const opsHabitCount = derivedHabits.filter(
    (habit) => !habit.isResting,
  ).length;
  const completedCount = derivedHabits.filter(
    (habit) => habit.isCompletedToday,
  ).length;

  // key from server truth: when router.refresh() delivers new props, the changed key
  // remounts the stateful subtree so optimistic client state re-seeds from the DB.
  // today is part of the key so a date rollover re-derives too.
  const stateKey =
    derivedHabits
      .map(
        (habit) =>
          `${habit.id}:${habit.isCompletedToday}:${habit.weeklyCompletionCount}`,
      )
      .join("|") + `|${today}`;

  return (
    <TodayCompletionsState
      key={stateKey}
      habits={derivedHabits}
      initialCompletedCount={completedCount}
      opsHabitCount={opsHabitCount}
    />
  );
}

function TodayCompletionsState({
  habits,
  initialCompletedCount,
  opsHabitCount,
}: {
  habits: DerivedTodayHabit[];
  initialCompletedCount: number;
  opsHabitCount: number;
}) {
  const [completedCount, setCompletedCount] = useState(initialCompletedCount);

  function adjustCompletedCount(delta: number) {
    setCompletedCount((currentCount) =>
      Math.max(0, Math.min(opsHabitCount, currentCount + delta)),
    );
  }

  return (
    <>
      <OpsProgress completedCount={completedCount} habitCount={opsHabitCount} />
      <div className="mt-4 h-px bg-cyan-divider" />
      <ul className="flex flex-col gap-2 py-5" aria-label="Today's habits">
        {habits.map((habit) => (
          <li key={habit.id}>
            <HabitCard
              habit={habit}
              initialIsCompletedToday={habit.isCompletedToday}
              initialWeeklyCompletionCount={habit.weeklyCompletionCount}
              completedOnDates={habit.completedOnDates}
              isResting={habit.isResting}
              onTodayCompletionChange={adjustCompletedCount}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
