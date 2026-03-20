import { useEffect, useRef } from "react";
import { createGraph, type GraphData, type Options, type Network } from "@infigraph/vis";

export interface GraphProps {
  data: GraphData;
  options?: Options;
  style?: React.CSSProperties;
  className?: string;
  onReady?: (network: Network) => void;
}

export function Graph({ data, options = {}, style, className, onReady }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const network = createGraph(containerRef.current, data, options);
    onReady?.(network);
    return () => network.destroy();
  }, [data, options]);

  return <div ref={containerRef} style={style} className={className} />;
}
