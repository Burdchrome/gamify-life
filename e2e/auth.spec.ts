import { expect, test, type Page } from "@playwright/test";

async function signInTestUser(page: Page) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("TEST_EMAIL and TEST_PASSWORD must be set for auth e2e.");
  }

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

test("signed-out visitor sees only sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Runner Access" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByText("RUNNER://daily")).toHaveCount(0);
});

test("test user signs in and reaches the shell", async ({ page }) => {
  await page.goto("/login");
  await signInTestUser(page);

  await expect(page.getByText("RUNNER://daily")).toBeVisible();
});

test("sign-out returns to login", async ({ page }) => {
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("button", { name: "DISCONNECT" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Runner Access" }),
  ).toBeVisible();
});
