import { expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TestAccount = {
  label: string;
  emailEnvName: string;
  passwordEnvName: string;
};

type HabitSeed = {
  name: string;
  target_per_week: number;
};

export const testUserAccount: TestAccount = {
  label: "test user",
  emailEnvName: "TEST_EMAIL",
  passwordEnvName: "TEST_PASSWORD",
};

// Never Josh's real account here: setup/cleanup delete every habit row they touch.
export const decoyAccount: TestAccount = {
  label: "decoy user",
  emailEnvName: "DECOY_EMAIL",
  passwordEnvName: "DECOY_PASSWORD",
};

export async function signInTestUser(page: Page) {
  const email = getRequiredEnv("TEST_EMAIL");
  const password = getRequiredEnv("TEST_PASSWORD");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "CONNECT" }).click();

  const errorAlert = page.getByTestId("login-error");
  const outcome = await Promise.race([
    page
      .waitForURL((url) => url.pathname === "/", { timeout: 15_000 })
      .then(() => "success" as const)
      .catch(() => "timeout" as const),
    errorAlert
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => "error" as const)
      .catch(() => "timeout" as const),
  ]);

  if (outcome === "error") {
    const signInError = (await errorAlert.textContent())?.trim() ?? "";
    await page.getByLabel("Password").fill("");
    await page.getByLabel("Email").fill("");
    throw new Error(`Sign-in failed: ${signInError}`);
  }

  if (outcome !== "success") {
    throw new Error("Sign-in neither reached the shell nor showed a form error.");
  }
}

export async function createSignedInSupabaseClient(
  account: TestAccount,
): Promise<SupabaseClient> {
  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: getRequiredEnv(account.emailEnvName),
    password: getRequiredEnv(account.passwordEnvName),
  });

  if (error) {
    throw new Error(`Sign-in failed for ${account.label}: ${error.message}`);
  }

  if (!data.user) {
    throw new Error(`Sign-in failed for ${account.label}: no user returned.`);
  }

  return supabase;
}

export async function deleteUserRows(
  supabase: SupabaseClient,
  accountLabel: string,
) {
  await deleteCompletionRows(supabase, accountLabel);
  await deleteHabitRows(supabase, accountLabel);
}

export async function seedHabitRows(
  supabase: SupabaseClient,
  accountLabel: string,
  habits: HabitSeed[],
) {
  const { error } = await supabase.from("habits").insert(habits);

  if (error) {
    throw new Error(`Habit seed failed for ${accountLabel}: ${error.message}`);
  }
}

async function deleteCompletionRows(
  supabase: SupabaseClient,
  accountLabel: string,
) {
  const emptyUuid = "00000000-0000-0000-0000-000000000000";
  const { error } = await supabase
    .from("completions")
    .delete()
    .neq("id", emptyUuid);

  if (error) {
    throw new Error(
      `Completion cleanup failed for ${accountLabel}: ${error.message}`,
    );
  }
}

async function deleteHabitRows(supabase: SupabaseClient, accountLabel: string) {
  const emptyUuid = "00000000-0000-0000-0000-000000000000";
  const { error } = await supabase.from("habits").delete().neq("id", emptyUuid);

  if (error) {
    throw new Error(`Habit cleanup failed for ${accountLabel}: ${error.message}`);
  }
}

// The card's writes are optimistic: the UI flips before the request lands, so
// a reload or follow-up click right after an assertion can kill an in-flight
// write (the trap completions.spec documents). Poll the DB row to know a
// toggle actually landed before acting again.
export async function expectCompletionRow(
  supabase: SupabaseClient,
  habitName: string,
  completedOn: string,
  shouldExist: boolean,
) {
  await expect
    .poll(
      async () => {
        const { data, error } = await supabase
          .from("completions")
          .select("id, habits!inner(name)")
          .eq("habits.name", habitName)
          .eq("completed_on", completedOn);
        if (error) {
          throw new Error(
            `Completion poll failed for ${habitName}: ${error.message}`,
          );
        }
        return data.length > 0;
      },
      { timeout: 10_000 },
    )
    .toBe(shouldExist);
}

// A one-off task is "done once" (issue #16): the invariant is the ROW COUNT,
// not any single row's presence, so poll the count when a move is under test.
export async function expectCompletionRowCount(
  supabase: SupabaseClient,
  habitName: string,
  expectedCount: number,
) {
  await expect
    .poll(
      async () => {
        const { data, error } = await supabase
          .from("completions")
          .select("id, habits!inner(name)")
          .eq("habits.name", habitName);
        if (error) {
          throw new Error(
            `Completion count poll failed for ${habitName}: ${error.message}`,
          );
        }
        return data.length;
      },
      { timeout: 10_000 },
    )
    .toBe(expectedCount);
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set for e2e.`);
  }

  return value;
}
