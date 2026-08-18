import { test as cleanup } from "@playwright/test";
import {
  createSignedInSupabaseClient,
  decoyAccount,
  deleteUserRows,
  testUserAccount,
} from "./helpers";

cleanup("cleanup backend state", async () => {
  const testSupabase = await createSignedInSupabaseClient(testUserAccount);
  await deleteUserRows(testSupabase, testUserAccount.label);

  const decoySupabase = await createSignedInSupabaseClient(decoyAccount);
  await deleteUserRows(decoySupabase, decoyAccount.label);
});
