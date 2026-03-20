import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import type { GraphData, CommunityConfig } from "./types.js";

export function resolveCommunities(
  data: GraphData,
  config?: CommunityConfig,
): Map<string | number, number> | null {
  if (!config) return null;

  if (config.communityKey) {
    return resolveFromField(data, config.communityKey);
  }

  return resolveWithLouvain(data, config.resolution, config.weightKey);
}

function resolveFromField(
  data: GraphData,
  key: string,
): Map<string | number, number> {
  const map = new Map<string | number, number>();
  for (const node of data.nodes) {
    const value = node[key];
    if (typeof value === "number") {
      map.set(node.id, value);
    }
  }
  return map;
}

function resolveWithLouvain(
  data: GraphData,
  resolution?: number,
  weightKey?: string,
): Map<string | number, number> {
  const graph = new Graph({ type: "undirected" });

  for (const node of data.nodes) {
    graph.addNode(String(node.id));
  }

  for (const edge of data.edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (graph.hasNode(from) && graph.hasNode(to) && !graph.hasEdge(from, to)) {
      const attrs: Record<string, unknown> = {};
      if (weightKey) {
        const w = edge[weightKey];
        if (typeof w === "number") attrs.weight = w;
      }
      graph.addEdge(from, to, attrs);
    }
  }

  const communities = louvain(graph, {
    resolution: resolution ?? 1,
    getEdgeWeight: weightKey ? "weight" : null,
  });

  const result = new Map<string | number, number>();
  for (const node of data.nodes) {
    const community = communities[String(node.id)];
    if (community != null) {
      result.set(node.id, community);
    }
  }
  return result;
}
