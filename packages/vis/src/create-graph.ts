import { Network, type Options, type Node, type Edge } from "vis-network";
import { DataSet } from "vis-data";
import type { GraphData, CommunityConfig } from "@infigraph/core";
import { resolveCommunities, buildCommunityGraph, CytoscapeCommunityLayout } from "@infigraph/core";

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  options: Options = {},
  community?: CommunityConfig,
): Network {
  const communities = resolveCommunities(data, community);

  let graphData = data;
  let mergedOptions = options;
  if (communities) {
    graphData = buildCommunityGraph(data, communities, community?.weightKey);
    const layout = new CytoscapeCommunityLayout();
    graphData = layout.run(graphData);
    mergedOptions = {
      ...options,
      physics: { enabled: false },
      nodes: { shape: "circle", ...options.nodes },
      interaction: { zoomView: true, zoomSpeed: 0.3, ...options.interaction },
    };
  }

  const nodes = new DataSet<Node>(graphData.nodes as Node[]);
  const edges = new DataSet<Edge>(graphData.edges as Edge[]);
  return new Network(container, { nodes, edges }, mergedOptions);
}
