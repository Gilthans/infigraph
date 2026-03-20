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

export interface LayoutAlgorithm {
  run(data: GraphData): GraphData;
}
