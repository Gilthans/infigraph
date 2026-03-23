import type { DataSet } from "vis-data";
import type { Network, Node } from "vis-network";

/**
 * Patches vis-network's internal hit-testing to respect an `interactive` flag
 * on nodes in the DataSet. When a node has `interactive: false`, it is excluded
 * from hit-testing — making it click-through for both selection (tap) and
 * dragging. All other nodes fall through to the original implementation.
 *
 * This works by monkey-patching `selectionHandler._getAllNodesOverlappingWith`,
 * the internal method used by vis-network for all pointer-based node lookups
 * (tap selection, drag initiation, hover detection).
 *
 * @returns A dispose function that restores the original hit-testing behavior.
 */
export function patchInteractiveNodes(network: Network, nodes: DataSet<Node>): () => void {
  // selectionHandler is not part of the public API but is accessible at runtime
  const handler = (network as unknown as Record<string, unknown>).selectionHandler as Record<
    string,
    unknown
  >;
  const original = handler._getAllNodesOverlappingWith as (obj: unknown) => string[];

  handler._getAllNodesOverlappingWith = function (obj: unknown): string[] {
    const hits = original.call(this, obj);
    return hits.filter((nodeId: string) => {
      const node = nodes.get(nodeId);
      return !node || (node as Record<string, unknown>).interactive !== false;
    });
  };

  return () => {
    handler._getAllNodesOverlappingWith = original;
  };
}
