import { expect, test } from "@playwright/test";
import {
  createSignedInSupabaseClient,
  signInTestUser,
  testUserAccount,
} from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// The card's writes are optimistic: aria-pressed flips before the
// insert/archive pair lands, and a reload right after would kill the in-flight
// requests (the same trap completions.spec documents). Wait for the DB row.
async function expectTaskArchivedState(
  supabase: SupabaseClient,
  isArchived: boolean,
) {
  await expect
    .poll(
      async () => {
        const { data, error } = await supabase
          .from("habits")
          .select("is_archived")
          .eq("name", "PAY RENT")
          .single();
        if (error) {
          throw new Error(`Task state poll failed: ${error.message}`);
        }
        return data.is_archived;
      },
      { timeout: 10_000 },
    )
    .toBe(isArchived);
}

// Runs between manage.spec and today.spec (alphabetical data-spec order). It
// creates its own task habit and must end with it COMPLETED (archived), so
// today.spec still sees exactly the two seeded habits on the Today view.
test("a completed task clears into the archive; un-tapping restores it", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  await page.goto("/login");
  await signInTestUser(page);

  // Create a task from Manage.
  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Protocol Name").fill("PAY RENT");
  await page.getByRole("button", { name: "TASK", exact: true }).click();
  await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Active protocol PAY RENT" }),
  ).toBeVisible();

  // On Today it lists as an op, with no weekly counter or progress bar.
  await page.getByRole("link", { name: "TODAY" }).click();
  const taskCard = page.getByRole("button", { name: /PAY RENT/ });
  await expect(taskCard).toBeVisible();
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();
  await expect(taskCard.getByText(/WEEKLY/)).toHaveCount(0);

  // Complete, then un-tap inside the grace window: the task returns to the
  // active list instead of staying archived.
  await taskCard.click();
  await expect(taskCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1/3 OPS COMPLETE")).toBeVisible();
  await expectTaskArchivedState(supabase, true);
  await taskCard.click();
  await expect(taskCard).toHaveAttribute("aria-pressed", "false");
  await expectTaskArchivedState(supabase, false);

  await page.reload();
  await expect(page.getByRole("button", { name: /PAY RENT/ })).toBeVisible();
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();

  // Complete for real: after a reload the task is gone from Today and sits in
  // the Manage archive.
  await page.getByRole("button", { name: /PAY RENT/ }).click();
  await expect(page.getByText("1/3 OPS COMPLETE")).toBeVisible();
  await expectTaskArchivedState(supabase, true);

  await page.reload();
  await expect(page.getByRole("button", { name: /PAY RENT/ })).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

  await page.getByRole("link", { name: "MANAGE" }).click();
  await expect(
    page.getByRole("listitem", { name: "Archived protocol PAY RENT" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Active protocol PAY RENT" }),
  ).toHaveCount(0);
});
