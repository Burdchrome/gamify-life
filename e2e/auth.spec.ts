import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

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
