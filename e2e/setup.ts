import { test as setup } from "@playwright/test";
import {
  createSignedInSupabaseClient,
  decoyAccount,
  deleteUserRows,
  seedHabitRows,
  testUserAccount,
} from "./helpers";

setup("prepare backend state", async () => {
  const testSupabase = await createSignedInSupabaseClient(testUserAccount);
  await deleteUserRows(testSupabase, testUserAccount.label);
  await seedHabitRows(testSupabase, testUserAccount.label, [
    { name: "HYDRATE", target_per_week: 5 },
    { name: "TRAIN", target_per_week: 3 },
  ]);

  const decoySupabase = await createSignedInSupabaseClient(decoyAccount);
  await deleteUserRows(decoySupabase, decoyAccount.label);
  await seedHabitRows(decoySupabase, decoyAccount.label, [
    { name: "DECOY OP - NOT YOURS", target_per_week: 4 },
  ]);
});
