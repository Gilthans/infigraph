import { Network, type Options, type Node, type Edge } from "vis-network";
import { DataSet } from "vis-data";

export type { Network, Options };
export { DataSet };

export interface GraphNode {
  id: number | string;
  label?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  from: number | string;
  to: number | string;
  [key: string]: unknown;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function createGraph(
  container: HTMLElement,
  data: GraphData,
  options: Options = {},
): Network {
  const nodes = new DataSet<Node>(data.nodes as Node[]);
  const edges = new DataSet<Edge>(data.edges as Edge[]);
  return new Network(container, { nodes, edges }, options);
}
