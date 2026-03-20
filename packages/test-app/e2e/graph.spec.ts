import { expect, test } from "@playwright/test";

const ALL_SAMPLES = [
  "simple-tree",
  "social-network",
  "copenhagen-calls",
  "college-msg",
  "reality-mining-calls",
];

// Large datasets won't render until we implement our own layout algorithm
const RENDERABLE_SAMPLES = ["simple-tree", "social-network", "copenhagen-calls"];

// Samples that support community detection (community graph is small enough to render)
const COMMUNITY_SAMPLES = ["social-network", "copenhagen-calls", "reality-mining-calls"];

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
    expect(labelsAfter.every((l) => /^Community \d+\n\d+ nodes$/.test(l))).toBe(true);

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

  for (const sample of COMMUNITY_SAMPLES) {
    test(`community layout has no overlapping nodes — ${sample}`, async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Detect communities").check();
      await page.selectOption("select", sample);
      const canvas = page.locator("canvas");
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(2000);

      const nodes: { x: number; y: number; size: number }[] = await page.evaluate(() => {
        const net = (window as unknown as Record<string, any>).__network;
        const ids: string[] = net.body.data.nodes.getIds();
        return ids.map((id: string) => {
          const pos = net.getPosition(id);
          const nodeData = net.body.data.nodes.get(id);
          return { x: pos.x, y: pos.y, size: nodeData.size ?? 1 };
        });
      });

      // All nodes have finite positions
      for (const node of nodes) {
        expect(Number.isFinite(node.x)).toBe(true);
        expect(Number.isFinite(node.y)).toBe(true);
      }

      // No pair of nodes overlaps (distance > sum of radii)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = nodes[i].size + nodes[j].size;
          expect(dist).toBeGreaterThan(minDist);
        }
      }

      await page.screenshot({
        path: `e2e/screenshots/${sample}-community-layout.png`,
        fullPage: true,
      });
    });
  }

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
