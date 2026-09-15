import { expect, test } from "@playwright/test";
import { listBackdateDates } from "../lib/dates";
import {
  createSignedInSupabaseClient,
  expectCompletionRow,
  signInTestUser,
  testUserAccount,
} from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// The card's writes are optimistic: aria-pressed flips before the
// insert/archive pair lands, and a reload right after would kill the in-flight
// requests (the same trap completions.spec documents). Wait for the DB row.
async function expectTaskArchivedState(
  supabase: SupabaseClient,
  taskName: string,
  isArchived: boolean,
) {
  await expect
    .poll(
      async () => {
        const { data, error } = await supabase
          .from("habits")
          .select("is_archived")
          .eq("name", taskName)
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

// Runs between manage.spec and today.spec (alphabetical data-spec order). Each
// test creates its own task habit; the afterEach below deletes its rows — a task
// completed today now stays on Today (issue #14), so archiving alone no longer
// hands today.spec the clean two-habit slate it asserts on.
async function deleteTaskRows(supabase: SupabaseClient, taskName: string) {
  const { data, error } = await supabase
    .from("habits")
    .select("id")
    .eq("name", taskName);
  if (error) {
    throw new Error(`Task row lookup failed for ${taskName}: ${error.message}`);
  }
  for (const habit of data ?? []) {
    const { error: completionError } = await supabase
      .from("completions")
      .delete()
      .eq("habit_id", habit.id);
    if (completionError) {
      throw new Error(
        `Task completion cleanup failed for ${taskName}: ${completionError.message}`,
      );
    }
    const { error: habitError } = await supabase
      .from("habits")
      .delete()
      .eq("id", habit.id);
    if (habitError) {
      throw new Error(
        `Task habit cleanup failed for ${taskName}: ${habitError.message}`,
      );
    }
  }
}

// Failure-safe: a task leaked by a mid-test assertion failure now renders ON
// Today (#14), which would fail today.spec in unrelated-looking ways — so
// cleanup runs after every test, pass or fail, not just on the happy path.
test.afterEach(async () => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  for (const taskName of ["PAY RENT", "RETURN LIBRARY BOOK", "CALL DENTIST"]) {
    await deleteTaskRows(supabase, taskName);
  }
});

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
  await expectTaskArchivedState(supabase, "PAY RENT", true);
  await taskCard.click();
  await expect(taskCard).toHaveAttribute("aria-pressed", "false");
  await expectTaskArchivedState(supabase, "PAY RENT", false);

  await page.reload();
  await expect(page.getByRole("button", { name: /PAY RENT/ })).toBeVisible();
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();

  // Complete for real: a task completed today is still one of today's ops
  // (issue #14) — after a reload it stays on Today, checked, counted on both
  // sides of the counter, while sitting in the Manage archive.
  await page.getByRole("button", { name: /PAY RENT/ }).click();
  await expect(page.getByText("1/3 OPS COMPLETE")).toBeVisible();
  await expectTaskArchivedState(supabase, "PAY RENT", true);

  await page.reload();
  const taskCardAfterReload = page.getByRole("button", { name: /PAY RENT/ });
  await expect(taskCardAfterReload).toBeVisible();
  await expect(taskCardAfterReload).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1/3 OPS COMPLETE")).toBeVisible();

  await page.getByRole("link", { name: "MANAGE" }).click();
  await expect(
    page.getByRole("listitem", { name: "Archived protocol PAY RENT" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Active protocol PAY RENT" }),
  ).toHaveCount(0);

});

// Issue #14's honesty edge: a task backdated to a PAST day was never one of
// today's ops, so it clears from Today with no counter credit.
test("a task backdated to a past day archives without counting toward today's ops", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Protocol Name").fill("RETURN LIBRARY BOOK");
  await page.getByRole("button", { name: "TASK", exact: true }).click();
  await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Active protocol RETURN LIBRARY BOOK" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  const taskItem = page
    .getByRole("listitem")
    .filter({ hasText: "RETURN LIBRARY BOOK" });
  await expect(taskItem).toBeVisible();
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();

  const [yesterday] = listBackdateDates(new Date());
  await taskItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  const yesterdayOption = taskItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();
  await expectCompletionRow(supabase, "RETURN LIBRARY BOOK", yesterday, true);
  await expectTaskArchivedState(supabase, "RETURN LIBRARY BOOK", true);

  // Not today's op: it leaves the list and the denominator, with no +1.
  await expect(
    page.getByRole("button", { name: /RETURN LIBRARY BOOK/ }),
  ).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: /RETURN LIBRARY BOOK/ }),
  ).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

});

// Issue #15: the ⟲ control says what it is before you tap it, and a backdated
// task announces what happened for a beat instead of vanishing unexplained.
test("the backdate control is labeled and a backdated task announces before clearing", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Protocol Name").fill("CALL DENTIST");
  await page.getByRole("button", { name: "TASK", exact: true }).click();
  await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Active protocol CALL DENTIST" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  const taskItem = page.getByRole("listitem").filter({ hasText: "CALL DENTIST" });
  await expect(taskItem).toBeVisible();

  // The visible affordance: every card's backdate button carries the PAST label.
  const backdateButton = taskItem.getByRole("button", { name: "LOG A PAST DAY" });
  await expect(backdateButton).toContainText("PAST");

  const [yesterday] = listBackdateDates(new Date());
  await backdateButton.click();
  const yesterdayOption = taskItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();

  // The feedback beat: the card says what happened before it clears.
  await expect(taskItem.getByText("LOGGED - ARCHIVED")).toBeVisible();
  await expectCompletionRow(supabase, "CALL DENTIST", yesterday, true);

  // Then it clears as before — a past-day backdate is not one of today's ops.
  await expect(
    page.getByRole("button", { name: /CALL DENTIST/ }),
  ).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

});
