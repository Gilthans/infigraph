import { useEffect, useRef } from "react";
import { createGraph, type GraphData } from "@infigraph/core";
import { useLocalStorageState } from "./useLocalStorageState";
import simpleTree from "./data/simple-tree.json";
import socialNetwork from "./data/social-network.json";
import copenhagenCalls from "./data/copenhagen-calls.json";
import collegeMsg from "./data/college-msg.json";
import realityMiningCalls from "./data/reality-mining-calls.json";

const samples: Record<string, GraphData> = {
  "simple-tree": simpleTree,
  "social-network": socialNetwork,
  "copenhagen-calls": copenhagenCalls,
  "college-msg": collegeMsg,
  "reality-mining-calls": realityMiningCalls,
};

const sampleKeys = Object.keys(samples);

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useLocalStorageState("selectedSample", sampleKeys[0]);

  const data = samples[selected] ?? samples[sampleKeys[0]];

  useEffect(() => {
    if (!containerRef.current) return;
    const network = createGraph(containerRef.current, data, {
      edges: { color: "#848484" },
      physics: { stabilization: { iterations: 150 } },
    });
    return () => network.destroy();
  }, [data]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
        <label>
          Sample:{" "}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {sampleKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
