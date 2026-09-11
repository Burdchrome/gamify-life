import { expect, test } from "@playwright/test";
import { getLocalDateIso } from "../lib/dates";
import {
  createSignedInSupabaseClient,
  expectCompletionRow,
  signInTestUser,
  testUserAccount,
} from "./helpers";

test("habit completion toggles optimistically and persists", async ({ page }) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const today = getLocalDateIso(new Date());

  await page.goto("/login");
  await signInTestUser(page);

  let hydrate = page.getByRole("button", { name: /HYDRATE/ });
  await hydrate.click();

  await expect(hydrate).toHaveAttribute("aria-pressed", "true");
  await expect(hydrate.getByText("✓")).toBeVisible();
  await expect(page.getByText("1/2 OPS COMPLETE")).toBeVisible();
  await expectCompletionRow(supabase, "HYDRATE", today, true);

  await page.reload();

  hydrate = page.getByRole("button", { name: /HYDRATE/ });
  await expect(hydrate).toHaveAttribute("aria-pressed", "true");
  await expect(hydrate.getByText("✓")).toBeVisible();
  await expect(page.getByText("1/2 OPS COMPLETE")).toBeVisible();

  await hydrate.click();

  await expect(hydrate).toHaveAttribute("aria-pressed", "false");
  await expect(hydrate.getByText("✓")).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();
  await expectCompletionRow(supabase, "HYDRATE", today, false);

  await page.reload();

  hydrate = page.getByRole("button", { name: /HYDRATE/ });
  await expect(hydrate).toHaveAttribute("aria-pressed", "false");
  await expect(hydrate.getByText("✓")).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();
});

test("failed write reverts the toggle and surfaces an error", async ({ page }) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const today = getLocalDateIso(new Date());

  await page.goto("/login");
  await signInTestUser(page);

  await page.route("**/rest/v1/completions**", (route) => route.abort());

  const hydrate = page.getByRole("button", { name: /HYDRATE/ });
  await hydrate.click();

  await expect(hydrate.getByText("SYNC FAILED - RETRY")).toBeVisible();
  await expect(hydrate).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

  // With the network path restored, the same tap succeeds and the error clears.
  await page.unroute("**/rest/v1/completions**");
  await hydrate.click();

  await expect(hydrate).toHaveAttribute("aria-pressed", "true");
  await expect(hydrate.getByText("SYNC FAILED - RETRY")).toHaveCount(0);
  await expect(page.getByText("1/2 OPS COMPLETE")).toBeVisible();
  await expectCompletionRow(supabase, "HYDRATE", today, true);

  // Seeding runs once per suite and data specs share state (alphabetical file
  // order: backdate → completions → manage → rest → task → today), so leave
  // HYDRATE un-completed — and wait for the DELETE to land in the DB before
  // reloading, or the reload kills it and leaks the completion to today.spec.
  await hydrate.click();
  await expect(hydrate).toHaveAttribute("aria-pressed", "false");
  await expectCompletionRow(supabase, "HYDRATE", today, false);
  await page.reload();
  const hydrateAfter = page.getByRole("button", { name: /HYDRATE/ });
  await expect(hydrateAfter).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();
});
