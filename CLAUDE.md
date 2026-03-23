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
pnpm lint                 # check formatting + lint (biome)
pnpm lint:fix             # auto-fix lint issues
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

### Test structure

Each test documents a single user journey in a specific situation. If two tests cover the same journey with different assertions, merge them. Extract shared setup and assertions into reusable helper functions (`setupX`, `getY`, `clickZ`) at the top of the test file to keep individual tests small and readable.

### Test-first workflow for bug fixes

1. **Start with a failing test.** Before writing any fix, write or update a test that reproduces the bug. The test must fail before the fix is applied.
2. **If a fix doesn't work but the test passes, fix the test first.** A passing test on broken code means the test isn't covering the real issue. Adjust the test until it fails, then resume fixing.
3. **Verify the test catches the bug.** After any test adjustment, temporarily disable the fix and confirm the test fails. Only then re-enable the fix and confirm the test passes.

## Collaboration style

When the user suggests a technical approach, adversarially evaluate whether it will actually work before implementing it. Consider the architecture (e.g. canvas-based rendering vs DOM, framework internals) and push back if the suggestion is unlikely to work or if a better alternative exists. Explain the reasoning clearly so the user can make an informed decision.
