import { type HabitKind } from "@/app/components/manage/types";

type WeeklyRestInput = {
  kind: HabitKind;
  weeklyCompletionCount: number;
  targetPerWeek: number;
  isCompletedToday: boolean;
};

// A weekly habit that met its target on EARLIER days rests until Monday
// (issue #13). Today's own completion never rests the card — un-tapping a
// mis-tap must stay possible.
export function isRestingWeekly({
  kind,
  weeklyCompletionCount,
  targetPerWeek,
  isCompletedToday,
}: WeeklyRestInput): boolean {
  return (
    kind === "weekly" &&
    !isCompletedToday &&
    weeklyCompletionCount >= targetPerWeek
  );
}
