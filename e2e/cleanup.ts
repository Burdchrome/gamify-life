import { test as cleanup } from "@playwright/test";

cleanup("cleanup backend state", async () => {
  // Add test-user table wipes here when tickets #4/#5 introduce user data.
});
