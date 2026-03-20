import { test, expect } from "@playwright/test";

test.describe("graph viewer", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so each test starts fresh
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("renders the default sample graph", async ({ page }) => {
    await page.goto("/");
    // Wait for vis-network canvas to appear
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(1000); // let physics settle
    await page.screenshot({ path: "e2e/screenshots/default-graph.png", fullPage: true });
  });

  test("switches to social-network sample", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await page.selectOption("select", "social-network");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e/screenshots/social-network.png", fullPage: true });
  });

  test("persists selection in localStorage", async ({ page }) => {
    await page.goto("/");
    await page.locator("canvas").waitFor({ timeout: 10_000 });

    await page.selectOption("select", "social-network");
    await page.reload();

    const selected = await page.locator("select").inputValue();
    expect(selected).toBe("social-network");
  });

  test("combo box lists all samples", async ({ page }) => {
    await page.goto("/");
    const options = await page.locator("select option").allTextContents();
    expect(options).toContain("simple-tree");
    expect(options).toContain("social-network");
  });
});
