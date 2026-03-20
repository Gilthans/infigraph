import { useEffect, useRef } from "react";
import { createGraph, type GraphData } from "@infigraph/core";

const sampleData: GraphData = {
  nodes: [
    { id: 1, label: "Node 1" },
    { id: 2, label: "Node 2" },
    { id: 3, label: "Node 3" },
    { id: 4, label: "Node 4" },
    { id: 5, label: "Node 5" },
  ],
  edges: [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 3, to: 5 },
  ],
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const network = createGraph(containerRef.current, sampleData, {
      edges: { color: "#848484" },
      physics: { stabilization: { iterations: 150 } },
    });
    return () => network.destroy();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
