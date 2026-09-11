import { expect, test } from "@playwright/test";
import { getLocalDateIso, getWeekBounds } from "../lib/dates";
import {
  createSignedInSupabaseClient,
  signInTestUser,
  testUserAccount,
} from "./helpers";

// Runs between manage.spec and task.spec (alphabetical data-spec order). It
// seeds its own weekly habit + a completion and deletes the habit at the end
// (completions cascade), so the later specs still see exactly the two seeded
// habits.
test("a weekly habit at target from an earlier day rests until Monday", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const now = new Date();
  const today = getLocalDateIso(now);
  const { weekStart } = getWeekBounds(now);

  const { data: habitRow, error: habitError } = await supabase
    .from("habits")
    .insert({ name: "WEEKLY REVIEW", kind: "weekly", target_per_week: 1 })
    .select("id")
    .single();
  if (habitError || !habitRow) {
    throw new Error(`Weekly habit seed failed: ${habitError?.message}`);
  }

  try {
    // weekStart (device Monday) is always inside the current week and never in
    // the future — the one date that makes this test deterministic year-round.
    const { error: completionError } = await supabase
      .from("completions")
      .insert({ habit_id: habitRow.id, completed_on: weekStart });
    if (completionError) {
      throw new Error(`Completion seed failed: ${completionError.message}`);
    }

    await page.goto("/login");
    await signInTestUser(page);

    const weeklyCard = page.getByRole("button", { name: /WEEKLY REVIEW/ });

    if (today === weekStart) {
      // Monday: the seeded completion IS today's, so the card reads as
      // completed-today (rest state never hides today's own tap).
      await expect(weeklyCard).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("1/3 OPS COMPLETE")).toBeVisible();
    } else {
      // Any other weekday: target met on an earlier day — the card rests,
      // caps at 1/1, leaves the ops denominator, and can't be tapped.
      await expect(weeklyCard.getByText("DONE FOR THIS WEEK")).toBeVisible();
      await expect(weeklyCard.getByText(/WEEKLY \d/)).toHaveCount(0);
      await expect(weeklyCard).toBeDisabled();
      await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();
    }
  } finally {
    const { error: cleanupError } = await supabase
      .from("habits")
      .delete()
      .eq("id", habitRow.id);
    if (cleanupError) {
      throw new Error(`Weekly habit cleanup failed: ${cleanupError.message}`);
    }
  }
});
