import { Network, type Options, type Node, type Edge } from "vis-network";
import { DataSet } from "vis-data";
import type { GraphData, CommunityConfig } from "@infigraph/core";
import { resolveCommunities, buildCommunityGraph } from "@infigraph/core";

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  options: Options = {},
  community?: CommunityConfig,
): Network {
  const communities = resolveCommunities(data, community);

  let graphData = data;
  if (communities) {
    graphData = buildCommunityGraph(data, communities, community?.weightKey);
  }

  const nodes = new DataSet<Node>(graphData.nodes as Node[]);
  const edges = new DataSet<Edge>(graphData.edges as Edge[]);
  return new Network(container, { nodes, edges }, options);
}
