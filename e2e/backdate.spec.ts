import { expect, test } from "@playwright/test";
import {
  countCompletionsThisWeek,
  getWeekBounds,
  listBackdateDates,
} from "../lib/dates";
import {
  createSignedInSupabaseClient,
  signInTestUser,
  testUserAccount,
} from "./helpers";

// Runs first among the data specs (alphabetical order). It writes a completion
// dated yesterday, which can never leak into the later specs' assertions (they
// only assert on "today"), but it still deletes the row at the end so every
// spec sees the same weekly counts the seed produced.
test("backdating yesterday counts toward the week without checking today", async ({
  page,
}) => {
  await page.goto("/login");
  await signInTestUser(page);

  const hydrateCard = page.getByRole("button", { name: /HYDRATE/ });
  const hydrateItem = page.getByRole("listitem").filter({ hasText: "HYDRATE" });

  await expect(hydrateCard).toHaveAttribute("aria-pressed", "false");
  await expect(hydrateCard.getByText("WEEKLY 0/5")).toBeVisible();

  await hydrateItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  const yesterdayOption = hydrateItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();

  // A Monday device day puts yesterday in the previous week; derive the
  // expectation with the same helpers the app uses instead of hardcoding 1.
  const [yesterday] = listBackdateDates(new Date());
  const expectedWeekly = countCompletionsThisWeek(
    [yesterday],
    getWeekBounds(new Date()),
  );

  await expect(
    hydrateCard.getByText(`WEEKLY ${expectedWeekly}/5`),
  ).toBeVisible();
  await expect(hydrateCard).toHaveAttribute("aria-pressed", "false");

  await page.reload();

  const hydrateCardAfter = page.getByRole("button", { name: /HYDRATE/ });
  await expect(
    hydrateCardAfter.getByText(`WEEKLY ${expectedWeekly}/5`),
  ).toBeVisible();
  await expect(hydrateCardAfter).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

  // An already-logged day is offered as done and not clickable — the UI-level
  // guarantee behind "backdating an already-completed day is a no-op".
  await hydrateItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  await expect(hydrateItem.getByTestId("backdate-day").first()).toBeDisabled();

  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const { error } = await supabase
    .from("completions")
    .delete()
    .eq("completed_on", yesterday);
  if (error) {
    throw new Error(`Backdate row cleanup failed: ${error.message}`);
  }
});
