export type LocalDateIso = `${number}-${string}-${string}`;

export type WeekBounds = {
  weekStart: LocalDateIso;
  weekEnd: LocalDateIso;
};

export function getLocalDateIso(now: Date): LocalDateIso {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` as LocalDateIso;
}

export function getWeekBounds(now: Date): WeekBounds {
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    weekStart: getLocalDateIso(weekStart),
    weekEnd: getLocalDateIso(weekEnd),
  };
}

export function countCompletionsThisWeek(
  completedOnDates: string[],
  bounds: WeekBounds,
): number {
  return completedOnDates.filter(
    (completedOn) =>
      completedOn >= bounds.weekStart && completedOn <= bounds.weekEnd,
  ).length;
}
