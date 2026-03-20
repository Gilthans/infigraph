import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import type { GraphData, LayoutAlgorithm } from "./types.js";

cytoscape.use(fcose);

const SIZE_MULTIPLIER = 150;

function nodeRadius(memberCount: number): number {
  return Math.sqrt(memberCount) * SIZE_MULTIPLIER;
}

/**
 * Iterative overlap removal: push apart any pair of nodes whose
 * center-to-center distance is less than the sum of their radii + padding.
 */
function removeOverlaps(
  nodes: { x: number; y: number; radius: number }[],
  padding: number,
  maxIterations = 100,
): void {
  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius + padding;
        if (dist < minDist) {
          const overlap = minDist - dist;
          // Normalize direction; if coincident, push in arbitrary direction
          const len = dist || 1;
          const nx = dx / len;
          const ny = dy / len;
          const shift = overlap / 2;
          a.x -= nx * shift;
          a.y -= ny * shift;
          b.x += nx * shift;
          b.y += ny * shift;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

export class CytoscapeCommunityLayout implements LayoutAlgorithm {
  run(data: GraphData): GraphData {
    const sizeMap = new Map<string, number>();
    for (const node of data.nodes) {
      const memberCount = typeof node.size === "number" ? node.size : 1;
      const diameter = nodeRadius(memberCount) * 2;
      sizeMap.set(String(node.id), diameter);
    }

    const cy = cytoscape({
      headless: true,
      styleEnabled: true,
      style: [
        {
          selector: "node",
          style: {
            width: (ele: any) => sizeMap.get(ele.id()) ?? 200,
            height: (ele: any) => sizeMap.get(ele.id()) ?? 200,
          },
        },
      ],
    });

    for (const node of data.nodes) {
      cy.add({
        group: "nodes",
        data: { id: String(node.id) },
      });
    }

    for (const edge of data.edges) {
      cy.add({
        group: "edges",
        data: {
          id: `${edge.from}-${edge.to}`,
          source: String(edge.from),
          target: String(edge.to),
        },
      });
    }

    cy.layout({
      name: "fcose",
      animate: false,
      nodeSeparation: 1500,
      idealEdgeLength: 1000,
      nodeRepulsion: () => 500000,
      quality: "proof",
      nodeDimensionsIncludeLabels: false,
    } as any).run();

    // Collect positions and radii
    const layoutNodes: { id: string; x: number; y: number; radius: number }[] = [];
    cy.nodes().forEach((n) => {
      const pos = n.position();
      const memberCount =
        typeof data.nodes.find((dn) => String(dn.id) === n.id())?.size === "number"
          ? (data.nodes.find((dn) => String(dn.id) === n.id())!.size as number)
          : 1;
      layoutNodes.push({
        id: n.id(),
        x: pos.x,
        y: pos.y,
        radius: nodeRadius(memberCount),
      });
    });

    cy.destroy();

    // Remove any remaining overlaps
    removeOverlaps(layoutNodes, 100);

    // Scale positions outward from centroid so each node can fill the viewport
    // without neighbors visible. Target: distance >= MIN_GAP_RATIO * sum of radii.
    const MIN_GAP_RATIO = 4;
    let worstRatio = Infinity;
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const dx = layoutNodes[i].x - layoutNodes[j].x;
        const dy = layoutNodes[i].y - layoutNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sumRadii = layoutNodes[i].radius + layoutNodes[j].radius;
        if (sumRadii > 0) {
          worstRatio = Math.min(worstRatio, dist / sumRadii);
        }
      }
    }
    if (worstRatio < MIN_GAP_RATIO && worstRatio > 0) {
      const scale = MIN_GAP_RATIO / worstRatio;
      const cx = layoutNodes.reduce((s, n) => s + n.x, 0) / layoutNodes.length;
      const cy2 = layoutNodes.reduce((s, n) => s + n.y, 0) / layoutNodes.length;
      for (const n of layoutNodes) {
        n.x = cx + (n.x - cx) * scale;
        n.y = cy2 + (n.y - cy2) * scale;
      }
    }

    const positionMap = new Map<string, { x: number; y: number }>();
    for (const ln of layoutNodes) {
      positionMap.set(ln.id, { x: ln.x, y: ln.y });
    }

    const nodes = data.nodes.map((node) => {
      const memberCount = typeof node.size === "number" ? node.size : 1;
      const radius = nodeRadius(memberCount);
      const pos = positionMap.get(String(node.id))!;
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        size: radius,
        font: { size: Math.max(radius * 0.6, 20) },
        fixed: { x: true, y: true },
        physics: false,
      };
    });

    return { nodes, edges: data.edges };
  }
}
