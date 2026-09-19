import { expect, test } from "@playwright/test";
import { getLocalDateIso, listBackdateDates } from "../lib/dates";
import {
  createSignedInSupabaseClient,
  decoyAccount,
  expectCompletionRow,
  expectCompletionRowCount,
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
  for (const taskName of [
    "PAY RENT",
    "RETURN LIBRARY BOOK",
    "CALL DENTIST",
    "FILE TAXES",
    "RENEW PASSPORT",
  ]) {
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

// Issue #9's failure edge: the un-tap pair is two writes (un-archive, then
// delete the completion). If it breaks between them, the task must stay
// recoverable from Today — never stranded archived with zero completion rows,
// which neither of Today's queries can see and Manage cannot restore.
test("a failed un-tap write leaves the task recoverable, not stranded", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Protocol Name").fill("FILE TAXES");
  await page.getByRole("button", { name: "TASK", exact: true }).click();
  await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Active protocol FILE TAXES" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  const taskCard = page.getByRole("button", { name: /FILE TAXES/ });
  await taskCard.click();
  await expect(taskCard).toHaveAttribute("aria-pressed", "true");
  await expectTaskArchivedState(supabase, "FILE TAXES", true);

  // Settle on server truth first: the tap's router.refresh() remounts the
  // card when it lands, and a remount mid-test would wipe the error state
  // this test is about to assert on.
  await page.reload();
  await expect(taskCard).toHaveAttribute("aria-pressed", "true");

  // Sever the un-archive leg only: habit PATCHes fail, everything else flows.
  await page.route("**/rest/v1/habits*", (route) =>
    route.request().method() === "PATCH" ? route.abort() : route.fallback(),
  );
  await taskCard.click();
  await expect(taskCard.getByText("SYNC FAILED - RETRY")).toBeVisible();
  // The optimistic un-tap reverted: still checked, still archived, and the
  // completion row survived — nothing was half-deleted.
  await expect(taskCard).toHaveAttribute("aria-pressed", "true");
  await expectTaskArchivedState(supabase, "FILE TAXES", true);

  // Link restored: the retry is one ordinary tap.
  await page.unroute("**/rest/v1/habits*");
  await taskCard.click();
  await expect(taskCard).toHaveAttribute("aria-pressed", "false");
  await expectTaskArchivedState(supabase, "FILE TAXES", false);
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();
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

// Issue #16: a one-off task is done ONCE. Backdating a task that was already
// tapped today is a correction ("it was actually yesterday"), so the existing
// completion MOVES to the picked day — never a second row. Real use hit this on
// day one (Clean phone: 09-15 tapped, then backdated to 09-14, two rows left).
test("backdating a task already completed today moves the completion instead of adding a row", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const now = new Date();
  const today = getLocalDateIso(now);
  const [yesterday] = listBackdateDates(now);

  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Protocol Name").fill("RENEW PASSPORT");
  await page.getByRole("button", { name: "TASK", exact: true }).click();
  await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Active protocol RENEW PASSPORT" }),
  ).toBeVisible();

  // Tap it today: one row dated today, archived, still on Today (issue #14).
  await page.getByRole("link", { name: "TODAY" }).click();
  const taskCard = page.getByRole("button", { name: /RENEW PASSPORT/ });
  await taskCard.click();
  await expect(taskCard).toHaveAttribute("aria-pressed", "true");
  await expectCompletionRow(supabase, "RENEW PASSPORT", today, true);
  await expectTaskArchivedState(supabase, "RENEW PASSPORT", true);

  // Settle on server truth before the gesture under test (standards: the tap's
  // router.refresh() would otherwise remount the card mid-assertion).
  await page.reload();
  const taskItem = page.getByRole("listitem").filter({ hasText: "RENEW PASSPORT" });
  await expect(taskItem.getByRole("button", { name: /RENEW PASSPORT/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("1/3 OPS COMPLETE")).toBeVisible();

  // The correction: PAST is still offered on a completed-today task, and
  // picking yesterday moves the row rather than adding one.
  await taskItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  const yesterdayOption = taskItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();

  await expectCompletionRow(supabase, "RENEW PASSPORT", yesterday, true);
  await expectCompletionRow(supabase, "RENEW PASSPORT", today, false);
  await expectCompletionRowCount(supabase, "RENEW PASSPORT", 1);
  await expectTaskArchivedState(supabase, "RENEW PASSPORT", true);

  // Now a past-day completion: not one of today's ops, so it clears from Today
  // and leaves the counter on both sides (same shape as the past-day backdate).
  await expect(
    page.getByRole("button", { name: /RENEW PASSPORT/ }),
  ).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: /RENEW PASSPORT/ }),
  ).toHaveCount(0);
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();
});

// Issue #16's two-lock check on the new write: the move is an UPDATE on
// completions, and update was never granted before. The grant is column-scoped
// (completed_on only) and the policy is per-user — so a signed-in user can move
// their own row's date, cannot re-point a row at a different habit, and cannot
// touch another user's rows at all.
test("the completion move grant is scoped to completed_on on the user's own rows", async ({}) => {
  const testSupabase = await createSignedInSupabaseClient(testUserAccount);
  const decoySupabase = await createSignedInSupabaseClient(decoyAccount);
  const now = new Date();
  const today = getLocalDateIso(now);
  const [yesterday, twoDaysAgo] = listBackdateDates(now);

  // Seed one completion per account (the decoy's habit comes from setup).
  const { data: decoyHabit, error: decoyHabitError } = await decoySupabase
    .from("habits")
    .select("id")
    .eq("name", "DECOY OP - NOT YOURS")
    .single();
  if (decoyHabitError) {
    throw new Error(`Decoy habit lookup failed: ${decoyHabitError.message}`);
  }
  const { data: decoyRow, error: decoySeedError } = await decoySupabase
    .from("completions")
    .insert({ habit_id: decoyHabit.id, completed_on: today })
    .select("id")
    .single();
  if (decoySeedError) {
    throw new Error(`Decoy completion seed failed: ${decoySeedError.message}`);
  }

  const { data: ownHabit, error: ownHabitError } = await testSupabase
    .from("habits")
    .insert({ name: "RENEW PASSPORT", kind: "task", target_per_week: 1 })
    .select("id")
    .single();
  if (ownHabitError) {
    throw new Error(`Own task seed failed: ${ownHabitError.message}`);
  }
  const { data: ownRow, error: ownSeedError } = await testSupabase
    .from("completions")
    .insert({ habit_id: ownHabit.id, completed_on: today })
    .select("id")
    .single();
  if (ownSeedError) {
    throw new Error(`Own completion seed failed: ${ownSeedError.message}`);
  }

  try {
    // Own row, completed_on only: allowed — this is the move.
    const { data: moved, error: moveError } = await testSupabase
      .from("completions")
      .update({ completed_on: yesterday })
      .eq("id", ownRow.id)
      .select("completed_on");
    expect(moveError).toBeNull();
    expect(moved).toEqual([{ completed_on: yesterday }]);

    // Own row, a column outside the grant: refused by the column-level grant.
    const { data: repointed, error: repointError } = await testSupabase
      .from("completions")
      .update({ habit_id: decoyHabit.id })
      .eq("id", ownRow.id)
      .select("id");
    expect(repointError).not.toBeNull();
    expect(repointed).toBeNull();

    // Another user's row: RLS makes it invisible to the update — zero rows
    // touched, and the decoy still sees its original date.
    const { data: crossUser, error: crossUserError } = await testSupabase
      .from("completions")
      .update({ completed_on: twoDaysAgo })
      .eq("id", decoyRow.id)
      .select("id");
    expect(crossUserError).toBeNull();
    expect(crossUser).toEqual([]);

    const { data: decoyAfter, error: decoyAfterError } = await decoySupabase
      .from("completions")
      .select("completed_on")
      .eq("id", decoyRow.id)
      .single();
    if (decoyAfterError) {
      throw new Error(`Decoy re-read failed: ${decoyAfterError.message}`);
    }
    expect(decoyAfter.completed_on).toBe(today);
  } finally {
    // Own rows go through afterEach; the decoy row is this test's alone.
    const { error } = await decoySupabase
      .from("completions")
      .delete()
      .eq("id", decoyRow.id);
    if (error) {
      throw new Error(`Decoy completion cleanup failed: ${error.message}`);
    }
  }
});

// Issue #16's race edge: the move is an UPDATE keyed on today's row. If another
// device already un-tapped the task (un-archived it and deleted today's row),
// the update matches nothing — and PostgREST reports that as success, not an
// error. That must read as stale state and resync, never as a logged move:
// the follow-up archive would otherwise strand the task archived with zero
// completion rows, which neither Today query can see (the #9 stranding case).
test("a move whose today row is already gone resyncs instead of stranding the task", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const now = new Date();
  const today = getLocalDateIso(now);
  const [yesterday] = listBackdateDates(now);

  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Protocol Name").fill("RENEW PASSPORT");
  await page.getByRole("button", { name: "TASK", exact: true }).click();
  await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Active protocol RENEW PASSPORT" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  await page.getByRole("button", { name: /RENEW PASSPORT/ }).click();
  await expectCompletionRow(supabase, "RENEW PASSPORT", today, true);
  await expectTaskArchivedState(supabase, "RENEW PASSPORT", true);
  await page.reload();
  const taskItem = page.getByRole("listitem").filter({ hasText: "RENEW PASSPORT" });
  await expect(taskItem.getByRole("button", { name: /RENEW PASSPORT/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // The other device un-taps: same write pair the card itself uses.
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .update({ is_archived: false })
    .eq("name", "RENEW PASSPORT")
    .select("id")
    .single();
  if (habitError) {
    throw new Error(`Other-device unarchive failed: ${habitError.message}`);
  }
  const { error: deleteError } = await supabase
    .from("completions")
    .delete()
    .eq("habit_id", habit.id)
    .eq("completed_on", today);
  if (deleteError) {
    throw new Error(`Other-device delete failed: ${deleteError.message}`);
  }
  await expectCompletionRowCount(supabase, "RENEW PASSPORT", 0);

  // This device, still showing the stale checked card, tries the move.
  await taskItem.getByRole("button", { name: "LOG A PAST DAY" }).click();
  const yesterdayOption = taskItem.getByTestId("backdate-day").first();
  await expect(yesterdayOption).toBeEnabled();
  await yesterdayOption.click();

  // Nothing moved, nothing archived: the task resyncs to its real state —
  // active, unchecked, still one of today's ops.
  const taskCard = page.getByRole("button", { name: /RENEW PASSPORT/ });
  await expect(taskCard).toHaveAttribute("aria-pressed", "false");
  await expect(taskCard.getByText("LOGGED - ARCHIVED")).toHaveCount(0);
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();
  await expectCompletionRow(supabase, "RENEW PASSPORT", yesterday, false);
  await expectCompletionRowCount(supabase, "RENEW PASSPORT", 0);
  await expectTaskArchivedState(supabase, "RENEW PASSPORT", false);

  await page.reload();
  await expect(page.getByRole("button", { name: /RENEW PASSPORT/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByText("0/3 OPS COMPLETE")).toBeVisible();
});
