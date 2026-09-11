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

// Server-side fetch ceiling: nothing legitimate is dated past the device's
// today, and the device sits at most a calendar day ahead of the server. +2
// keeps margin; the client clamps precisely (issue #13).
export function getCompletionsFetchCeiling(now: Date): LocalDateIso {
  const ceiling = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  ceiling.setDate(ceiling.getDate() + 2);

  return getLocalDateIso(ceiling);
}

export function countCompletionsThisWeek(
  completedOnDates: string[],
  bounds: WeekBounds,
  today: LocalDateIso,
): number {
  // Ceiling is TODAY, not the week's Sunday (issue #13): a row dated later in
  // the current week must never read as already done.
  const countCeiling = today <= bounds.weekEnd ? today : bounds.weekEnd;

  return completedOnDates.filter(
    (completedOn) =>
      completedOn >= bounds.weekStart && completedOn <= countCeiling,
  ).length;
}
