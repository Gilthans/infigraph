import { test, expect } from "@playwright/test";

const ALL_SAMPLES = [
  "simple-tree",
  "social-network",
  "copenhagen-calls",
  "college-msg",
  "reality-mining-calls",
];

// Large datasets won't render until we implement our own layout algorithm
const RENDERABLE_SAMPLES = ["simple-tree", "social-network", "copenhagen-calls"];

test.describe("graph viewer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("combo box lists all samples", async ({ page }) => {
    await page.goto("/");
    const options = await page.locator("select option").allTextContents();
    expect(options).toEqual(ALL_SAMPLES);
  });

  test("renders the default sample graph", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e/screenshots/default-graph.png", fullPage: true });
  });

  test("persists selection in localStorage", async ({ page }) => {
    await page.goto("/");
    await page.locator("canvas").waitFor({ timeout: 10_000 });

    await page.selectOption("select", "social-network");
    await page.reload();

    const selected = await page.locator("select").inputValue();
    expect(selected).toBe("social-network");
  });

  test("community detection colors nodes by group", async ({ page }) => {
    await page.goto("/");
    await page.selectOption("select", "social-network");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await page.getByLabel("Detect communities").check();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: "e2e/screenshots/social-network-communities.png",
      fullPage: true,
    });
  });

  for (const sample of RENDERABLE_SAMPLES.slice(1)) {
    test(`renders ${sample}`, async ({ page }) => {
      await page.goto("/");
      const canvas = page.locator("canvas");
      await expect(canvas).toBeVisible({ timeout: 10_000 });

      await page.selectOption("select", sample);
      await expect(canvas).toBeVisible({ timeout: 30_000 });

      await page.waitForTimeout(1500);
      await page.screenshot({ path: `e2e/screenshots/${sample}.png`, fullPage: true });
    });
  }
});
