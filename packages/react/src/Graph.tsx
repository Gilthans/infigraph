import {
  type CommunityConfig,
  createGraph,
  type GraphData,
  type Network,
  type Options,
} from "@infigraph/vis";
import { useEffect, useRef } from "react";

export interface GraphProps {
  data: GraphData;
  options?: Options;
  community?: CommunityConfig;
  style?: React.CSSProperties;
  className?: string;
  onReady?: (network: Network) => void;
}

export function Graph({ data, options = {}, community, style, className, onReady }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const network = createGraph(containerRef.current, data, options, community);
    onReady?.(network);
    return () => network.destroy();
  }, [data, options, community, onReady]);

  return <div ref={containerRef} style={style} className={className} />;
}
