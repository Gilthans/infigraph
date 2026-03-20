import { useEffect, useRef } from "react";
import { createGraph, type GraphData, type Options, type Network, type CommunityConfig } from "@infigraph/vis";

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
  }, [data, options, community]);

  return <div ref={containerRef} style={style} className={className} />;
}
