import { expect, test } from "@playwright/test";
import { isRestingWeekly } from "../lib/habit-status";

test("a weekly habit at target from earlier days rests", () => {
  expect(
    isRestingWeekly({
      kind: "weekly",
      weeklyCompletionCount: 1,
      targetPerWeek: 1,
      isCompletedToday: false,
    }),
  ).toBe(true);
});

test("a weekly habit that reached target with TODAY's tap does not rest", () => {
  // Un-tapping a mis-tap must stay possible: today's own completion never
  // locks the card.
  expect(
    isRestingWeekly({
      kind: "weekly",
      weeklyCompletionCount: 1,
      targetPerWeek: 1,
      isCompletedToday: true,
    }),
  ).toBe(false);
});

test("a weekly habit under target does not rest", () => {
  expect(
    isRestingWeekly({
      kind: "weekly",
      weeklyCompletionCount: 1,
      targetPerWeek: 3,
      isCompletedToday: false,
    }),
  ).toBe(false);
});

test("daily and task habits never rest", () => {
  expect(
    isRestingWeekly({
      kind: "daily",
      weeklyCompletionCount: 7,
      targetPerWeek: 5,
      isCompletedToday: false,
    }),
  ).toBe(false);
  expect(
    isRestingWeekly({
      kind: "task",
      weeklyCompletionCount: 1,
      targetPerWeek: 1,
      isCompletedToday: false,
    }),
  ).toBe(false);
});
