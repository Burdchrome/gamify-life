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

// Keep this test LAST among the data specs: it archives every seeded habit to
// reach the zero-habit state and nothing un-archives them (cleanup wipes after).
test("zero habits shows the empty state pointing to Manage", async ({ page }) => {
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  for (const habitName of ["HYDRATE", "TRAIN"]) {
    await page
      .getByRole("article", { name: `Active protocol ${habitName}` })
      .getByRole("button", { name: "ARCHIVE" })
      .click();
    await expect(
      page.getByRole("article", { name: `Active protocol ${habitName}` }),
    ).toHaveCount(0);
  }

  await page.getByRole("link", { name: "TODAY" }).click();

  await expect(page.getByText("NO OPS LOADED - SYSTEM STANDBY")).toBeVisible();
  const manageLink = page.getByRole("link", {
    name: "UPLOAD PROTOCOLS VIA MANAGE",
  });
  await expect(manageLink).toBeVisible();
  await manageLink.click();
  await expect(page.getByText("MANAGE://protocols")).toBeVisible();
});
