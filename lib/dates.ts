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

// Server-side fetch floor for completions. The server's calendar day can sit
// a day off the device's (server renders in UTC; devices span UTC-12..+14),
// and a Monday-start week reaches at most 6 days behind the device's today —
// worst case 7 days behind the server's. 9 days keeps margin; the client
// filters precisely with its own clock (issue #8: only the device interprets
// "today").
export function getCompletionsFetchFloor(now: Date): LocalDateIso {
  const floor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  floor.setDate(floor.getDate() - 9);

  return getLocalDateIso(floor);
}

// The backdate picker offers 7 days: deep enough to catch anything the evening
// nudge misses, and safely inside the server's 9-day fetch floor even when the
// server clock trails the device by a calendar day (issue #10).
export const backdateDayCount = 7;

export function listBackdateDates(now: Date): LocalDateIso[] {
  return Array.from({ length: backdateDayCount }, (_, index) => {
    const pastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    pastDay.setDate(pastDay.getDate() - (index + 1));

    return getLocalDateIso(pastDay);
  });
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
