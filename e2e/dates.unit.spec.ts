import { expect, test } from "@playwright/test";
import {
  countCompletionsThisWeek,
  getLocalDateIso,
  getWeekBounds,
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

test("weekly completion count includes only dates inside the bounds", () => {
  const bounds = { weekStart: "2026-08-17", weekEnd: "2026-08-23" } as const;

  expect(
    countCompletionsThisWeek(
      ["2026-08-16", "2026-08-17", "2026-08-20", "2026-08-23", "2026-08-24"],
      bounds,
    ),
  ).toBe(3);
});
