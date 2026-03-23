import type { DataSet } from "vis-data";
import type { Edge, Network, Node } from "vis-network";
import { patchInteractiveNodes } from "./interactive-nodes.js";

const PALETTE: string[] = [
  "66, 133, 244", // blue
  "219, 68, 55", // red
  "244, 180, 0", // yellow
  "15, 157, 88", // green
  "171, 71, 188", // purple
  "255, 112, 67", // orange
  "0, 172, 193", // teal
  "124, 179, 66", // lime
];

const MIN_ALPHA = 0.1;

export function setupCommunityFade(
  network: Network,
  nodes: DataSet<Node>,
  edges: DataSet<Edge>,
  container: HTMLElement,
): () => void {
  const allNodes = nodes.get();
  const allEdges = edges.get();
  if (allNodes.length === 0) return () => {};

  let maxRadius = 0;
  for (const node of allNodes) {
    const r = (node.size as number) ?? 0;
    if (r > maxRadius) maxRadius = r;
  }
  if (maxRadius === 0) return () => {};

  const restoreHitTest = patchInteractiveNodes(network, nodes);

  // Assign colors from palette
  nodes.update(
    allNodes.map((node, i) => ({
      id: node.id,
      color: {
        background: `rgba(${PALETTE[i % PALETTE.length]}, 1.0)`,
        border: `rgb(${PALETTE[i % PALETTE.length]})`,
      },
    })),
  );

  let prevAlpha = 1.0;
  let prevScale = -1;
  let nodesInteractive = true;

  function checkFade() {
    const scale: number = network.getScale();
    if (scale === prevScale) return;
    prevScale = scale;

    const height = container.clientHeight;
    const fadeStartScale = (height * 0.3) / (2 * maxRadius);
    const fadeEndScale = (height * 1.2) / (2 * maxRadius);

    let alpha: number;
    if (scale <= fadeStartScale) {
      alpha = 1.0;
    } else if (scale >= fadeEndScale) {
      alpha = MIN_ALPHA;
    } else {
      alpha =
        1.0 - ((1.0 - MIN_ALPHA) * (scale - fadeStartScale)) / (fadeEndScale - fadeStartScale);
    }

    if (Math.abs(alpha - prevAlpha) < 0.01) return;
    prevAlpha = alpha;

    // Labels and edges fade to 0 faster than fill
    const detailAlpha = Math.max(0, (alpha - MIN_ALPHA) / (1.0 - MIN_ALPHA)) ** 3;

    const halfAlpha = (1.0 + MIN_ALPHA) / 2;
    const shouldBeInteractive = alpha > halfAlpha;

    nodes.update(
      allNodes.map((node, i) => ({
        id: node.id,
        color: {
          background: `rgba(${PALETTE[i % PALETTE.length]}, ${alpha})`,
          border: `rgb(${PALETTE[i % PALETTE.length]})`,
        },
        font: {
          color: `rgba(0, 0, 0, ${detailAlpha})`,
        },
        // Set interactive flag for the getNodeAt patch
        ...(shouldBeInteractive !== nodesInteractive ? { interactive: shouldBeInteractive } : {}),
      })),
    );

    if (shouldBeInteractive !== nodesInteractive) {
      nodesInteractive = shouldBeInteractive;
      if (!nodesInteractive) {
        network.unselectAll();
      }
    }

    edges.update(
      allEdges.map((edge) => ({
        id: edge.id,
        color: { color: `rgba(128, 128, 128, ${detailAlpha})` },
      })),
    );
  }

  // Use afterDrawing to catch both user zoom and programmatic moveTo
  network.on("afterDrawing", checkFade);

  return () => {
    network.off("afterDrawing", checkFade);
    restoreHitTest();
  };
}
