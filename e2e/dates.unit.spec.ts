import { expect, test } from "@playwright/test";
import {
  countCompletionsThisWeek,
  getCompletionsFetchFloor,
  getLocalDateIso,
  getWeekBounds,
  listBackdateDates,
} from "../lib/dates";

test("local date keeps an 11:50pm tap on the same local day", () => {
  const lateLocalTap = new Date(2026, 7, 18, 23, 50);

  expect(getLocalDateIso(lateLocalTap)).toBe("2026-08-18");
});

test("local date keeps a 00:10am tap on the same local day", () => {
  const earlyLocalTap = new Date(2026, 7, 18, 0, 10);

  expect(getLocalDateIso(earlyLocalTap)).toBe("2026-08-18");
});

test("local construction avoids the UTC next-day midnight bug", () => {
  const lateLocalTap = new Date(2026, 7, 18, 23, 50);
  const utcDate = lateLocalTap.toISOString().slice(0, 10);

  expect(getLocalDateIso(lateLocalTap)).toBe("2026-08-18");

  // The trap this guards: toISOString() rolls a late-evening tap to tomorrow's UTC
  // date. Only observable west of UTC — the unit project pins TZ=America/New_York
  // (playwright.config.ts) so this assertion cannot silently skip.
  expect(
    lateLocalTap.getTimezoneOffset(),
    "unit tests must run west of UTC to exercise the midnight trap — check the TZ pin in playwright.config.ts",
  ).toBeGreaterThan(0);
  expect(utcDate).toBe("2026-08-19");
});

test("week bounds start on Monday for a Sunday", () => {
  const sunday = new Date(2026, 7, 23, 12);

  expect(getWeekBounds(sunday)).toEqual({
    weekStart: "2026-08-17",
    weekEnd: "2026-08-23",
  });
});

test("week bounds start on the same day for a Monday", () => {
  const monday = new Date(2026, 7, 24, 12);

  expect(getWeekBounds(monday)).toEqual({
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
  });
});

test("completions fetch floor reaches 9 days back, across a month edge", () => {
  const earlySeptember = new Date(2026, 8, 3, 12);

  expect(getCompletionsFetchFloor(earlySeptember)).toBe("2026-08-25");
});

test("fetch floor covers a device week even when the server day trails by one", () => {
  // Worst case for issue #8: device is a calendar day AHEAD of the server and
  // its today is a Sunday, putting the device weekStart 6 days behind device
  // today = 7 behind server today. The floor must still reach it.
  const deviceSunday = new Date(2026, 7, 23, 12);
  const trailingServerNow = new Date(2026, 7, 22, 23);

  const deviceWeek = getWeekBounds(deviceSunday);
  const floor = getCompletionsFetchFloor(trailingServerNow);

  expect(floor <= deviceWeek.weekStart).toBe(true);
});

test("backdate dates are the 7 days before today, yesterday first", () => {
  const midSeptember = new Date(2026, 8, 11, 12);

  expect(listBackdateDates(midSeptember)).toEqual([
    "2026-09-10",
    "2026-09-09",
    "2026-09-08",
    "2026-09-07",
    "2026-09-06",
    "2026-09-05",
    "2026-09-04",
  ]);
});

test("backdate dates never include today or a future date", () => {
  const now = new Date(2026, 8, 11, 23, 50);
  const today = getLocalDateIso(now);

  for (const date of listBackdateDates(now)) {
    expect(date < today).toBe(true);
  }
});

test("backdate dates stay above the server fetch floor even with a day of clock skew", () => {
  // Worst case: server clock trails the device by a calendar day. Every date
  // the picker can write must still be shipped back by the server's floor,
  // or a just-backdated completion would vanish on the next load.
  const deviceNow = new Date(2026, 8, 11, 0, 30);
  const trailingServerNow = new Date(2026, 8, 10, 23, 30);

  const floor = getCompletionsFetchFloor(trailingServerNow);
  for (const date of listBackdateDates(deviceNow)) {
    expect(date >= floor).toBe(true);
  }
});

test("weekly completion count includes only dates inside the bounds", () => {
  const bounds = { weekStart: "2026-08-17", weekEnd: "2026-08-23" } as const;

  expect(
    countCompletionsThisWeek(
      ["2026-08-16", "2026-08-17", "2026-08-20", "2026-08-23", "2026-08-24"],
      bounds,
    ),
  ).toBe(3);
});
