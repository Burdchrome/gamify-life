import { expect, test } from "@playwright/test";
import { getLocalDateIso, getWeekBounds } from "../lib/dates";
import {
  createForm,
  createSignedInSupabaseClient,
  expectCompletionRow,
  signInTestUser,
  testUserAccount,
} from "./helpers";

test("manage view creates, edits, retargets, and archives a habit", async ({
  page,
}) => {
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await expect(page).toHaveURL(new RegExp("/manage$"));
  await expect(page.getByText("MANAGE://protocols")).toBeVisible();

  await page.getByLabel("Protocol Name").fill("MEDITATE");
  await createForm(page)
    .getByRole("group", { name: "Weekly Target" })
    .getByRole("button", { name: "4" })
    .click();
  await page.getByRole("button", { name: "UPLOAD" }).click();

  await expect(
    page.getByRole("article", { name: "Active protocol MEDITATE" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  await expect(page).toHaveURL(new RegExp("/$"));
  await expect(page.getByRole("button", { name: /MEDITATE/ })).toBeVisible();
  // Default kind is daily, whose counter reads THIS WEEK (issue #13).
  await expect(page.getByText("THIS WEEK 0/4")).toBeVisible();

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page.getByLabel("Rename MEDITATE").fill("MEDITATE PM");
  await page
    .getByRole("article", { name: "Active protocol MEDITATE" })
    .getByRole("button", { name: "SAVE" })
    .click();

  await expect(
    page.getByRole("article", { name: "Active protocol MEDITATE PM" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  await expect(
    page.getByRole("button", { name: /MEDITATE PM/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page
    .getByRole("article", { name: "Active protocol MEDITATE PM" })
    .getByRole("group", { name: "Weekly Target" })
    .getByRole("button", { name: "2" })
    .click();
  await page
    .getByRole("article", { name: "Active protocol MEDITATE PM" })
    .getByRole("button", { name: "SAVE" })
    .click();

  await page.getByRole("link", { name: "TODAY" }).click();
  await expect(page.getByText("THIS WEEK 0/2")).toBeVisible();

  await page.getByRole("link", { name: "MANAGE" }).click();
  await page
    .getByRole("article", { name: "Active protocol MEDITATE PM" })
    .getByRole("button", { name: "ARCHIVE" })
    .click();

  await expect(
    page.getByRole("article", { name: "Active protocol MEDITATE PM" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Archived protocols").getByText("MEDITATE PM"),
  ).toBeVisible();
  await expect(
    page.getByLabel("Archived protocols").getByText("ARCHIVED", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  await expect(page.getByRole("button", { name: /MEDITATE PM/ })).toHaveCount(
    0,
  );
});

// Issue #17: a habit's kind is editable after creation. The reclassification
// pass left "Clean living room" as a daily 1/wk that read like a weekly and
// never rested; the only fix was a hand-edited row. Kind changes write only
// `kind` (target and completion rows are untouched), and Today re-derives the
// card from the new kind on the next render.
test("manage view changes a habit's kind and Today re-derives the card", async ({
  page,
}) => {
  const supabase = await createSignedInSupabaseClient(testUserAccount);
  const now = new Date();
  const today = getLocalDateIso(now);
  // weekStart (device Monday) is always inside the current week and never in
  // the future — the one seed date that keeps this deterministic year-round
  // (same call rest.spec makes).
  const { weekStart } = getWeekBounds(now);
  const article = page.getByRole("article", { name: "Active protocol STRETCH" });
  const kindGroup = article.getByRole("group", { name: "Type" });
  let habitId: string | null = null;

  try {
    await page.goto("/login");
    await signInTestUser(page);

    // Create as a daily with a 3/wk quota.
    await page.getByRole("link", { name: "MANAGE" }).click();
    await page.getByLabel("Protocol Name").fill("STRETCH");
    await createForm(page)
      .getByRole("group", { name: "Weekly Target" })
      .getByRole("button", { name: "3" })
      .click();
    await page.getByRole("button", { name: "UPLOAD", exact: true }).click();
    await expect(article).toBeVisible();

    // The edit row offers the same three kinds, pre-selected to the current one.
    await expect(kindGroup.getByRole("button", { name: "DAILY" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(kindGroup.getByRole("button", { name: "WEEKLY" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // One completion this week, dated by the device. As a daily it is quiet
    // progress; as a weekly at a 1/wk target it is the week's target met.
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("id")
      .eq("name", "STRETCH")
      .single();
    if (habitError) {
      throw new Error(`STRETCH lookup failed: ${habitError.message}`);
    }
    habitId = habit.id;
    const { error: seedError } = await supabase
      .from("completions")
      .insert({ habit_id: habit.id, completed_on: weekStart });
    if (seedError) {
      throw new Error(`STRETCH completion seed failed: ${seedError.message}`);
    }

    // daily → weekly, target 3 → 1: SAVE is enabled by the kind change alone
    // and the card re-derives as a weekly at target.
    await kindGroup.getByRole("button", { name: "WEEKLY" }).click();
    await article
      .getByRole("group", { name: "Weekly Target" })
      .getByRole("button", { name: "1" })
      .click();
    await article.getByRole("button", { name: "SAVE" }).click();
    await expect(article.getByRole("button", { name: "SAVE" })).toBeDisabled();
    await expect(kindGroup.getByRole("button", { name: "WEEKLY" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("link", { name: "TODAY" }).click();
    const stretchCard = page.getByRole("button", { name: /STRETCH/ });
    if (today === weekStart) {
      // Monday: the seeded completion IS today's, so the card reads as
      // completed-today (rest never hides today's own tap) — rest.spec's shape.
      await expect(stretchCard).toHaveAttribute("aria-pressed", "true");
      await expect(stretchCard.getByText(/WEEKLY \d/)).toHaveCount(0);
    } else {
      // Any other weekday: target met on an earlier day — the card rests,
      // untappable, with no counter overshoot.
      await expect(stretchCard.getByText("DONE FOR THIS WEEK")).toBeVisible();
      await expect(stretchCard).toBeDisabled();
    }

    // weekly → task: the target picker leaves the row; Today shows ONE-OFF.
    // A reclassified habit is not thereby completed — it stays active, and
    // its stored target survives unseen so switching back restores it.
    await page.getByRole("link", { name: "MANAGE" }).click();
    await kindGroup.getByRole("button", { name: "TASK" }).click();
    await expect(article.getByRole("group", { name: "Weekly Target" })).toHaveCount(0);
    await article.getByRole("button", { name: "SAVE" }).click();
    await expect(article.getByRole("button", { name: "SAVE" })).toBeDisabled();

    await page.getByRole("link", { name: "TODAY" }).click();
    await expect(stretchCard.getByText("ONE-OFF")).toBeVisible();
    await expect(stretchCard).toBeEnabled();

    // task → daily: the picker returns showing the preserved target (1), and
    // the week's row counts as quiet progress again — always 1/1, since
    // weekStart is inside the current week by construction.
    await page.getByRole("link", { name: "MANAGE" }).click();
    await kindGroup.getByRole("button", { name: "DAILY" }).click();
    await expect(
      article.getByRole("group", { name: "Weekly Target" }).getByRole("button", { name: "1" }),
    ).toHaveAttribute("aria-pressed", "true");
    await article.getByRole("button", { name: "SAVE" }).click();
    await expect(article.getByRole("button", { name: "SAVE" })).toBeDisabled();

    await page.getByRole("link", { name: "TODAY" }).click();
    await expect(stretchCard.getByText("THIS WEEK 1/1")).toBeVisible();

    // The kind edits never touched the completion row.
    await expectCompletionRow(supabase, "STRETCH", weekStart, true);
  } finally {
    // Failure-safe cleanup (completions cascade): a leaked STRETCH would break
    // the specs after this one, and a silent cleanup failure would hide why.
    const query = habitId
      ? supabase.from("habits").delete().eq("id", habitId)
      : supabase.from("habits").delete().eq("name", "STRETCH");
    const { error: cleanupError } = await query;
    if (cleanupError) {
      throw new Error(`STRETCH cleanup failed: ${cleanupError.message}`);
    }
  }
});
