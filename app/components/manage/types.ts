export type HabitKind = "task" | "daily" | "weekly";

export type ManageHabit = {
  id: string;
  name: string;
  kind: HabitKind;
  target_per_week: number;
  is_archived: boolean;
};
