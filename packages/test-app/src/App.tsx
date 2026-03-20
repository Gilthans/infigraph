import { Graph, type GraphData } from "@infigraph/react";
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

const graphOptions = {
  edges: { color: "#848484" },
  physics: { stabilization: { iterations: 150 } },
};

export default function App() {
  const [selected, setSelected] = useLocalStorageState("selectedSample", sampleKeys[0]);
  const [detectCommunities, setDetectCommunities] = useLocalStorageState("detectCommunities", false);

  const data = samples[selected] ?? samples[sampleKeys[0]];

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
        <label style={{ marginLeft: 16 }}>
          <input
            type="checkbox"
            checked={detectCommunities}
            onChange={(e) => setDetectCommunities(e.target.checked)}
          />{" "}
          Detect communities
        </label>
      </div>
      <Graph
        data={data}
        options={graphOptions}
        community={detectCommunities ? { weightKey: "weight" } : undefined}
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  );
}
