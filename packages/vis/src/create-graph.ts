import { Network, type Options, type Node, type Edge } from "vis-network";
import { DataSet } from "vis-data";
import type { GraphData, CommunityConfig } from "@infigraph/core";
import { resolveCommunities } from "@infigraph/core";

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  options: Options = {},
  community?: CommunityConfig,
): Network {
  const communities = resolveCommunities(data, community);

  let nodeArray = data.nodes as Node[];
  if (communities) {
    nodeArray = data.nodes.map((n) => {
      const communityId = communities.get(n.id);
      return communityId != null ? { ...n, group: String(communityId) } as Node : n as Node;
    });
  }

  const nodes = new DataSet<Node>(nodeArray);
  const edges = new DataSet<Edge>(data.edges as Edge[]);
  return new Network(container, { nodes, edges }, options);
}
