import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

test("today view shows only the signed-in user's habits", async ({ page }) => {
  await page.goto("/login");
  await signInTestUser(page);

  await expect(page.getByText("HYDRATE")).toBeVisible();
  await expect(page.getByText("TRAIN")).toBeVisible();
  await expect(page.getByText("0/2 OPS COMPLETE")).toBeVisible();
  await expect(page.getByText("DECOY OP - NOT YOURS")).toHaveCount(0);

  await page.reload();

  await expect(page.getByText("HYDRATE")).toBeVisible();
  await expect(page.getByText("TRAIN")).toBeVisible();
});
