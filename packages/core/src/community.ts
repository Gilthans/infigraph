import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import type { CommunityConfig, GraphData, GraphEdge, GraphNode } from "./types.js";

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

function resolveFromField(data: GraphData, key: string): Map<string | number, number> {
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

/**
 * Collapse a graph by its community assignments: each community becomes a node,
 * edges between communities are aggregated with summed weights.
 */
export function buildCommunityGraph(
  data: GraphData,
  communities: Map<string | number, number>,
  weightKey?: string,
): GraphData {
  // Collect unique community IDs and the member nodes for labeling
  const communityMembers = new Map<number, (string | number)[]>();
  for (const node of data.nodes) {
    const c = communities.get(node.id);
    if (c == null) continue;
    let members = communityMembers.get(c);
    if (!members) {
      members = [];
      communityMembers.set(c, members);
    }
    members.push(node.id);
  }

  const nodes: GraphNode[] = [];
  for (const [c, members] of communityMembers) {
    nodes.push({
      id: c,
      label: `Community ${c}\n${members.length} nodes`,
      size: members.length,
      memberIds: members,
    });
  }

  // Aggregate edges between communities, summing weights
  const edgeMap = new Map<string, number>();
  for (const edge of data.edges) {
    const cFrom = communities.get(edge.from);
    const cTo = communities.get(edge.to);
    if (cFrom == null || cTo == null || cFrom === cTo) continue;

    const lo = Math.min(cFrom, cTo);
    const hi = Math.max(cFrom, cTo);
    const key = `${lo}-${hi}`;

    const w = weightKey && typeof edge[weightKey] === "number" ? (edge[weightKey] as number) : 1;
    edgeMap.set(key, (edgeMap.get(key) ?? 0) + w);
  }

  const edges: GraphEdge[] = [];
  for (const [key, weight] of edgeMap) {
    const [from, to] = key.split("-").map(Number);
    edges.push({ from, to, weight });
  }

  return { nodes, edges };
}
