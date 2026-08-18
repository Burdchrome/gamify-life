"use client";

import { useState } from "react";
import { HabitCard, type Habit } from "./habit-card";
import { OpsProgress } from "./ops-progress";

export type TodayHabit = Habit & {
  isCompletedToday: boolean;
  weeklyCompletionCount: number;
};

type TodayCompletionsProps = {
  habits: TodayHabit[];
  initialCompletedCount: number;
};

export function TodayCompletions(props: TodayCompletionsProps) {
  // key from server truth: when router.refresh() delivers new props, the changed key
  // remounts the stateful subtree so optimistic client state re-seeds from the DB.
  const stateKey = props.habits
    .map(
      (habit) =>
        `${habit.id}:${habit.isCompletedToday}:${habit.weeklyCompletionCount}`,
    )
    .join("|");

  return <TodayCompletionsState key={stateKey} {...props} />;
}

function TodayCompletionsState({
  habits,
  initialCompletedCount,
}: TodayCompletionsProps) {
  const [completedCount, setCompletedCount] = useState(initialCompletedCount);

  function adjustCompletedCount(delta: number) {
    setCompletedCount((currentCount) =>
      Math.max(0, Math.min(habits.length, currentCount + delta)),
    );
  }

  return (
    <>
      <OpsProgress completedCount={completedCount} habitCount={habits.length} />
      <div className="mt-4 h-px bg-cyan-divider" />
      <ul className="flex flex-col gap-2 py-5" aria-label="Today's habits">
        {habits.map((habit) => (
          <li key={habit.id}>
            <HabitCard
              habit={habit}
              initialIsCompletedToday={habit.isCompletedToday}
              initialWeeklyCompletionCount={habit.weeklyCompletionCount}
              onTodayCompletionChange={adjustCompletedCount}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
