import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

test("manage view creates, edits, retargets, and archives a habit", async ({
  page,
}) => {
  await page.goto("/login");
  await signInTestUser(page);

  await page.getByRole("link", { name: "MANAGE" }).click();
  await expect(page).toHaveURL(new RegExp("/manage$"));
  await expect(page.getByText("MANAGE://protocols")).toBeVisible();

  await page.getByLabel("Protocol Name").fill("MEDITATE");
  await page
    .getByRole("group", { name: "Weekly Target" })
    .first()
    .getByRole("button", { name: "4" })
    .click();
  await page.getByRole("button", { name: "UPLOAD" }).click();

  await expect(
    page.getByRole("article", { name: "Active protocol MEDITATE" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  await expect(page).toHaveURL(new RegExp("/$"));
  await expect(page.getByRole("button", { name: /MEDITATE/ })).toBeVisible();
  await expect(page.getByText("WEEKLY 0/4")).toBeVisible();

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
  await expect(page.getByText("WEEKLY 0/2")).toBeVisible();

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
    page.getByLabel("Archived protocols").getByText("ARCHIVED"),
  ).toBeVisible();

  await page.getByRole("link", { name: "TODAY" }).click();
  await expect(page.getByRole("button", { name: /MEDITATE PM/ })).toHaveCount(
    0,
  );
});
