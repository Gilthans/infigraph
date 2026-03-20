# Infigraph

A library for rendering arbitrarily large networks using a level-of-detail pyramid, inspired by mipmapping in computer graphics. When zoomed out, only a small community graph is rendered (detected via Louvain). When the user zooms into a community node, that community's subgraph is rendered on demand. Panning away or zooming out discards the detail, keeping the number of rendered elements constant regardless of total network size.

## Monorepo structure

- **pnpm workspaces** monorepo
- `packages/core` — `@infigraph/core`: types, community detection (Louvain), layout algorithms (Cytoscape fcose)
- `packages/vis` — `@infigraph/vis`: vis-network adapter, `createGraph()`
- `packages/react` — `@infigraph/react`: `<Graph>` React component
- `packages/test-app` — Vite + React app for iterating on datasets and configurations

Dependency chain: `react → vis → core`

## Commands

```bash
pnpm install              # install all dependencies
pnpm build                # build core → vis → react
pnpm dev                  # start test-app dev server
pnpm --filter test-app test   # run Playwright e2e tests (auto-starts dev server)
```

## Testing policy

Every change must be covered by a test that would catch a regression. Before adding tests:

1. Review existing tests — check if a break in the change would already be caught.
2. If not, add the minimum number of tests needed for maximum coverage of the change.
3. Avoid redundant tests. Each test should cover distinct behavior, not duplicate existing assertions.

Tests use Playwright with screenshot support (`packages/test-app/e2e/`). Screenshots go to `e2e/screenshots/` and can be viewed to visually verify rendering.
