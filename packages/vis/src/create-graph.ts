import { Network, type Options, type Node, type Edge } from "vis-network";
import { DataSet } from "vis-data";
import type { GraphData } from "@infigraph/core";

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  options: Options = {},
): Network {
  const nodes = new DataSet<Node>(data.nodes as Node[]);
  const edges = new DataSet<Edge>(data.edges as Edge[]);
  return new Network(container, { nodes, edges }, options);
}
