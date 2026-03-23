import { expect, type Page, test } from "@playwright/test";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Enable community detection on a given sample and wait for render. */
async function setupCommunityGraph(page: Page, sample = "social-network") {
  await page.goto("/");
  await page.selectOption("select", sample);
  await page.getByLabel("Detect communities").check();
  await page.locator("canvas").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1500);
}

/** Read aggregate state from the network in one round-trip. */
function getNetworkState(page: Page) {
  return page.evaluate(() => {
    const net = (window as unknown as Record<string, any>).__network;
    const ids: string[] = net.body.data.nodes.getIds();
    const node0 = net.body.data.nodes.get(ids[0]);
    const bg = node0.color?.background as string;
    const m = bg.match(/rgba\(.+,\s*([\d.]+)\)/);
    return {
      scale: net.getScale() as number,
      alpha: m ? Number.parseFloat(m[1]) : 1.0,
      interactive: node0.interactive as boolean | undefined,
      selected: net.getSelectedNodes() as string[],
      viewPos: net.getViewPosition() as { x: number; y: number },
    };
  });
}

/** Get DOM coordinates of a node (by index into the id list). */
function getNodeDOMPos(page: Page, index = 0) {
  return page.evaluate((i) => {
    const net = (window as unknown as Record<string, any>).__network;
    const ids: string[] = net.body.data.nodes.getIds();
    return net.canvasToDOM(net.getPosition(ids[i]));
  }, index);
}

/** Click directly on a node and return selected node ids. */
async function clickNode(page: Page, index = 0) {
  const pos = await getNodeDOMPos(page, index);
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const net = (window as unknown as Record<string, any>).__network;
    return net.getSelectedNodes() as string[];
  });
}

/** Get all node labels from the network. */
function getNodeLabels(page: Page) {
  return page.evaluate(() => {
    const net = (window as unknown as Record<string, any>).__network;
    return net.body.data.nodes
      .getIds()
      .map((id: any) => net.body.data.nodes.get(id).label) as string[];
  });
}

/** Get background color strings for all nodes. */
function getBackgroundColors(page: Page) {
  return page.evaluate(() => {
    const net = (window as unknown as Record<string, any>).__network;
    const ids: string[] = net.body.data.nodes.getIds();
    return ids.map((id: string) => net.body.data.nodes.get(id).color?.background as string);
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

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

    const labelsBefore = await getNodeLabels(page);
    expect(labelsBefore).toContain("Alice");

    await page.getByLabel("Detect communities").check();
    await page.waitForTimeout(1500);

    const labelsAfter = await getNodeLabels(page);
    expect(labelsAfter.length).toBeGreaterThan(0);
    expect(labelsAfter.length).toBeLessThan(labelsBefore.length);
    expect(labelsAfter.every((l) => /^Community \d+\n\d+ nodes$/.test(l))).toBe(true);

    await page.screenshot({
      path: "e2e/screenshots/social-network-communities.png",
      fullPage: true,
    });

    await page.getByLabel("Detect communities").uncheck();
    await page.waitForTimeout(1500);

    const labelsRestored = await getNodeLabels(page);
    expect(labelsRestored).toContain("Alice");
    expect(labelsRestored.length).toBe(labelsBefore.length);
  });

  for (const sample of COMMUNITY_SAMPLES) {
    test(`community layout has no overlapping nodes — ${sample}`, async ({ page }) => {
      await setupCommunityGraph(page, sample);
      await page.waitForTimeout(500);

      const nodes: { x: number; y: number; size: number }[] = await page.evaluate(() => {
        const net = (window as unknown as Record<string, any>).__network;
        const ids: string[] = net.body.data.nodes.getIds();
        return ids.map((id: string) => {
          const pos = net.getPosition(id);
          const nodeData = net.body.data.nodes.get(id);
          return { x: pos.x, y: pos.y, size: nodeData.size ?? 1 };
        });
      });

      for (const node of nodes) {
        expect(Number.isFinite(node.x)).toBe(true);
        expect(Number.isFinite(node.y)).toBe(true);
      }

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

  test("community fade: zoom in fades nodes, zoom out restores, faded nodes are click-through", async ({
    page,
  }) => {
    await setupCommunityGraph(page);

    const canvasBox = (await page.locator("canvas").boundingBox())!;
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    // 1. Initial state: fully opaque, interactive, selectable
    const colors0 = await getBackgroundColors(page);
    for (const c of colors0) {
      expect(c).toMatch(/rgba\(.+,\s*1(\.0)?\)/);
    }
    const sel0 = await clickNode(page);
    expect(sel0.length).toBeGreaterThan(0);
    await page.evaluate(() => {
      (window as unknown as Record<string, any>).__network.unselectAll();
    });

    // 2. Zoom in with mouse wheel until nodes become non-interactive
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, -150);
      await page.waitForTimeout(100);
      const s = await getNetworkState(page);
      if (s.interactive === false) break;
    }
    const faded = await getNetworkState(page);
    expect(faded.alpha).toBeLessThan(0.7);
    expect(faded.interactive).toBe(false);

    // 3. Clicking a faded node does NOT select it
    const sel1 = await clickNode(page);
    expect(sel1).toHaveLength(0);

    // 4. Dragging on top of a faded node pans the view instead of moving the node
    await page.evaluate(() => {
      const net = (window as unknown as Record<string, any>).__network;
      const ids: string[] = net.body.data.nodes.getIds();
      net.moveTo({ position: net.getPosition(ids[0]) });
    });
    await page.waitForTimeout(300);
    const nodeWorldBefore = await page.evaluate(() => {
      const net = (window as unknown as Record<string, any>).__network;
      const ids: string[] = net.body.data.nodes.getIds();
      return net.getPosition(ids[0]);
    });
    const box2 = (await page.locator("canvas").boundingBox())!;
    const dragX = box2.x + box2.width / 2;
    const dragY = box2.y + box2.height / 2;
    const viewBefore = (await getNetworkState(page)).viewPos;
    await page.mouse.move(dragX, dragY);
    await page.mouse.down();
    await page.mouse.move(dragX + 100, dragY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const viewAfter = (await getNetworkState(page)).viewPos;
    expect(viewAfter.x).not.toBeCloseTo(viewBefore.x, 0);
    const nodeWorldAfter = await page.evaluate(() => {
      const net = (window as unknown as Record<string, any>).__network;
      const ids: string[] = net.body.data.nodes.getIds();
      return net.getPosition(ids[0]);
    });
    expect(nodeWorldAfter.x).toBeCloseTo(nodeWorldBefore.x, 0);
    expect(nodeWorldAfter.y).toBeCloseTo(nodeWorldBefore.y, 0);

    // 5. Zoom back out — nodes restore to opaque and interactive
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(100);
      const s = await getNetworkState(page);
      if (s.interactive !== false && s.alpha > 0.9) break;
    }
    const restored = await getNetworkState(page);
    expect(restored.interactive).not.toBe(false);
    expect(restored.alpha).toBeGreaterThan(0.8);
    // Alpha should be close to fully opaque (wheel zoom may not land exactly at 1.0)
    const colorsRestored = await getBackgroundColors(page);
    for (const c of colorsRestored) {
      const m = c.match(/rgba\(.+,\s*([\d.]+)\)/);
      expect(m).not.toBeNull();
      expect(Number.parseFloat(m![1])).toBeGreaterThan(0.8);
    }

    // 6. Clicking a node selects it again
    await page.evaluate(() => {
      (window as unknown as Record<string, any>).__network.fit({ animation: false });
    });
    await page.waitForTimeout(500);
    const sel2 = await clickNode(page);
    expect(sel2.length).toBeGreaterThan(0);

    await page.screenshot({
      path: "e2e/screenshots/community-fade-interaction.png",
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
