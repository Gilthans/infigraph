# Infigraph

Render arbitrarily large networks in the browser by borrowing a trick from computer graphics: **level-of-detail pyramids**.

## The problem

Force-directed layouts collapse under the weight of large networks. A graph with 10,000 nodes takes minutes to stabilize and produces an unreadable hairball. 100,000 nodes won't render at all.

## The idea

Large images face the same problem — you can't push every pixel to the screen at once. The solution is a **mipmap pyramid**: zoomed out, a low-resolution version is sufficient because fine details aren't visible. Zoomed in, you only need a small, high-resolution tile. The total number of rendered pixels stays bounded.

Infigraph applies this to networks using **community detection** as the pyramid mechanism:

1. **Zoomed out** — Run Louvain community detection to collapse the full network into a small community graph (tens of nodes instead of thousands). Each community node is sized proportionally to its member count.
2. **Zoomed in** — When the user zooms into a community node, render that community's subgraph on demand.
3. **Zoomed/panned away** — Discard the subgraph and return to the community view.

This keeps the number of rendered nodes roughly constant, regardless of total network size.

## Current status

- Community detection (Louvain) collapses networks into community graphs
- Cytoscape.js (fcose) computes a headless layout with overlap removal and spacing guarantees
- vis-network renders the result with pre-computed positions and deep zoom support
- Community nodes display their name and member count, sized by `sqrt(memberCount)`

**Next milestone:** rendering community subgraphs inside nodes on zoom-in, completing the pyramid.

## Architecture

```
@infigraph/react  -->  @infigraph/vis  -->  @infigraph/core
   React component      vis-network          Types, community detection,
                         adapter              Cytoscape layout (headless)
```

| Package | Role |
|---|---|
| `packages/core` | Pure logic: types, Louvain community detection (graphology), layout (Cytoscape fcose) |
| `packages/vis` | vis-network adapter — `createGraph()` wires up data, layout, and rendering |
| `packages/react` | `<Graph>` React component |
| `packages/test-app` | Vite + React app with sample datasets and Playwright e2e tests |

## Getting started

```bash
pnpm install
pnpm build
pnpm dev        # opens the test app at localhost:5173
```

## Running tests

```bash
pnpm --filter test-app test
```

Tests use Playwright and verify layout correctness (no overlapping nodes, finite positions) across multiple datasets including networks with 6,800+ nodes.

## How the layout works

1. **Community detection** — Louvain algorithm partitions nodes into communities, producing a collapsed graph where each node represents a community.
2. **Headless layout** — Cytoscape.js runs the fcose (fast compound spring embedder) algorithm in a headless instance, with node dimensions set to match the visual size of each community.
3. **Overlap removal** — An iterative pass pushes apart any remaining overlapping pairs.
4. **Spacing expansion** — Positions are scaled outward from the centroid until every pair of nodes is separated by at least 4x their combined radii, ensuring each community can fill the viewport without neighbors visible.
5. **Fixed rendering** — The computed positions are fed to vis-network with physics disabled.

## License

MIT
