import type { CommunityConfig, GraphData } from "@infigraph/core";
import { buildCommunityGraph, CytoscapeCommunityLayout, resolveCommunities } from "@infigraph/core";
import { DataSet } from "vis-data";
import { type Edge, Network, type Node, type Options } from "vis-network";

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
