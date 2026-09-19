import { expect, test } from "@playwright/test";
import {
  countCompletionsThisWeek,
  getLocalDateIso,
  getWeekBounds,
  listBackdateDates,
} from "../lib/dates";
import {
  createSignedInSupabaseClient,
  expectCompletionRow,
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
  await expect(hydrateCard.getByText("THIS WEEK 0/5")).toBeVisible();

  // A Monday device day puts yesterday in the previous week; derive the
  // expectation with the same helpers the app uses instead of hardcoding 1.
  const now = new Date();
  const [yesterday] = listBackdateDates(now);
  const supabase = await createSignedInSupabaseClient(testUserAccount);

  await hydrateItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  const yesterdayOption = hydrateItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();
  await expectCompletionRow(supabase, "HYDRATE", yesterday, true);
  const expectedWeekly = countCompletionsThisWeek(
    [yesterday],
    getWeekBounds(now),
    getLocalDateIso(now),
  );

  await expect(
    hydrateCard.getByText(`THIS WEEK ${expectedWeekly}/5`),
  ).toBeVisible();
  await expect(hydrateCard).toHaveAttribute("aria-pressed", "false");

  await page.reload();

  const hydrateCardAfter = page.getByRole("button", { name: /HYDRATE/ });
  await expect(
    hydrateCardAfter.getByText(`THIS WEEK ${expectedWeekly}/5`),
  ).toBeVisible();
  await expect(hydrateCardAfter).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

  // An already-logged day is offered as done and not clickable — the UI-level
  // guarantee behind "backdating an already-completed day is a no-op".
  await hydrateItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  await expect(hydrateItem.getByTestId("backdate-day").first()).toBeDisabled();

  const { error } = await supabase
    .from("completions")
    .delete()
    .eq("completed_on", yesterday);
  if (error) {
    throw new Error(`Backdate row cleanup failed: ${error.message}`);
  }
});

// Issue #16's ride-along: the just-logged day must read as done the moment the
// write lands, not only once router.refresh() re-delivers completedOnDates.
// The refresh is held back here so the window the flash lived in stays open
// long enough to assert on (a re-click in that window hit the 23505 path — no
// corruption, just a confusing enabled button). Deliberate exception to the
// "settle with page.reload() before asserting transient client state" rule in
// docs/agents/standards.md: the transient state IS the thing under test, so
// the race is neutralized by holding the refresh instead of waiting it out.
test("a just-logged day is disabled before the refresh lands", async ({
  page,
}) => {
  await page.goto("/login");
  await signInTestUser(page);

  const hydrateItem = page.getByRole("listitem").filter({ hasText: "HYDRATE" });
  const [yesterday] = listBackdateDates(new Date());
  const supabase = await createSignedInSupabaseClient(testUserAccount);

  // Hold every RSC refetch (router.refresh) for a few seconds; ordinary
  // navigations and REST calls flow untouched. The `rsc: 1` request header is
  // Next's internal marker for these fetches — if a Next upgrade renames it,
  // this hold silently stops holding and the test loses its teeth (it would
  // still pass, since the refreshed props also disable the day).
  const refreshHoldMs = 4_000;
  const isTodayPage = (url: URL) => url.pathname === "/";
  const heldRefreshes: Promise<void>[] = [];
  await page.route(
    isTodayPage,
    async (route) => {
      if (route.request().headers()["rsc"] === "1") {
        const hold = new Promise<void>((resolve) =>
          setTimeout(resolve, refreshHoldMs),
        );
        heldRefreshes.push(hold);
        await hold;
      }
      await route.fallback();
    },
  );

  await hydrateItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  const yesterdayOption = hydrateItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();
  await expectCompletionRow(supabase, "HYDRATE", yesterday, true);

  // Inside the held window: the popover closed on success; reopening it must
  // already show yesterday as logged.
  await hydrateItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  await expect(hydrateItem.getByTestId("backdate-day").first()).toBeDisabled();
  await expect(
    hydrateItem.getByTestId("backdate-day").first().getByText("✓"),
  ).toBeVisible();

  // Let every held refresh release before tearing the route down, so no
  // handler is left calling fallback() on a request the reload already killed.
  await Promise.all(heldRefreshes);
  await page.unroute(isTodayPage);
  await page.reload();
  const { error } = await supabase
    .from("completions")
    .delete()
    .eq("completed_on", yesterday);
  if (error) {
    throw new Error(`Backdate row cleanup failed: ${error.message}`);
  }
});
