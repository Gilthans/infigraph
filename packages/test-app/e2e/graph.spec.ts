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

  test("community detection renders a collapsed community graph", async ({ page }) => {
    await page.goto("/");
    await page.selectOption("select", "social-network");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);

    // Before: original nodes
    const labelsBefore: string[] = await page.evaluate(() => {
      const net = (window as unknown as Record<string, any>).__network;
      return net.body.data.nodes.getIds().map((id: any) => net.body.data.nodes.get(id).label);
    });
    expect(labelsBefore).toContain("Alice");

    // Enable community detection
    await page.getByLabel("Detect communities").check();
    await page.waitForTimeout(1500);

    // After: community nodes
    const labelsAfter: string[] = await page.evaluate(() => {
      const net = (window as unknown as Record<string, any>).__network;
      return net.body.data.nodes.getIds().map((id: any) => net.body.data.nodes.get(id).label);
    });
    expect(labelsAfter.length).toBeGreaterThan(0);
    expect(labelsAfter.length).toBeLessThan(labelsBefore.length);
    expect(labelsAfter.every((l) => l.startsWith("Community "))).toBe(true);

    await page.screenshot({
      path: "e2e/screenshots/social-network-communities.png",
      fullPage: true,
    });

    // Disable: back to original nodes
    await page.getByLabel("Detect communities").uncheck();
    await page.waitForTimeout(1500);

    const labelsRestored: string[] = await page.evaluate(() => {
      const net = (window as unknown as Record<string, any>).__network;
      return net.body.data.nodes.getIds().map((id: any) => net.body.data.nodes.get(id).label);
    });
    expect(labelsRestored).toContain("Alice");
    expect(labelsRestored.length).toBe(labelsBefore.length);
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
