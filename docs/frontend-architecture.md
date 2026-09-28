# Frontend Architecture

Target structure for `src/`, grouped by feature instead of by file type. Component and hook rules: [`.claude/rules/react-standards.md`](../.claude/rules/react-standards.md).

> **Migration:** the tree follows this structure since #96 (kebab-case) and #42 (feature folders), and styling is Tailwind and shadcn/ui only since #40. Nothing is pending (see the [Migration map](#migration-map)).

## Target structure

```
src/
├── main.tsx              Vite entry: starts Sentry, mounts <App /> and global styles, nothing else
├── app/                  app shell: App, providers, query client, router (route tree), Sentry setup
├── routes/               TanStack Router code routes: one *-route.tsx per route
├── features/             feature slices, never import each other
│   ├── champions/        champion grid, search, champion header and skills
│   ├── build-calculator/ level, item slots, stats panel (on top of lib/stats)
│   └── item-shop/        item grid, role/stat filters, sorting, tooltips
├── data/                 game data loading: fetch + Zod parsing, data hooks, query options
│   ├── services/         fetchGameData, fetchManifest, fetchChampion, fetchItems
│   ├── queries/          queryOptions() factories (gameDataQueries)
│   └── hooks/            use-current-patch.ts, use-champions.ts, use-champion.ts, use-items.ts
├── components/
│   ├── ui/               primitives with no domain knowledge: button, slider, tooltip
│   └── common/           shared app UI: header, logo, app name
├── lib/                  pure, React-free code: stats engine, cn(), formatters
├── hooks/                hooks used by 2+ features
├── types/                types used by 2+ features (not derivable from a schema)
├── assets/               images imported by code
└── styles/               app.css: Tailwind entry, theme tokens, base styles
```

### Feature anatomy

```
features/<feature>/
├── components/   UI used only by this feature
├── hooks/        use-*.ts, with their query options
├── services/     feature IO: storage, URL encoding
├── lib/          pure functions for this feature (tested with bun test)
└── types/        feature-only types
```

- Create only the folders a feature needs.
- A component is one file (`champion-card.tsx`). It becomes a folder `champion-card/` only when it has sub-parts; `index.tsx` then holds the component itself, not a re-export list.
- No barrel files re-exporting a folder; import the file directly.
- `lib/` (root or feature) never imports React, so it stays trivially testable.

### Import boundaries

- **A feature never imports another feature. No exceptions.** Routes compose features; anything two features need is promoted to a shared layer.
- When two features interact, the route wires them with props and callbacks. Example: the champion route calls `useBuild()` (build-calculator) and passes `build.addItem` to `ItemShop` (item-shop) as `onItemClick`; the shop never knows about the build.
- Features may import only the shared layers: `components/{ui,common}`, `lib`, `hooks`, `types`, `data`.
- Shared layers never import from `features/` or `routes/`.
- CI enforces this with Biome `noRestrictedImports` overrides in `biome.json`: one override per feature lists the other features, one covers the shared layers. **Adding a feature means adding its override and its name to the other features' lists.**

```ts
// src/features/build-calculator/components/stats-panel.tsx

// Forbidden: another feature
import { ChampionCard } from "../../champions/components/champion-card"

// Allowed: shared layers
import { useChampion } from "@/data/hooks/use-champion"
import { computeStats } from "@/lib/stats/compute-stats"
```

### Game data boundary

- `src/data` is the only place that fetches and parses game data (`fetchGameData(path, schema)`) and exposes it through hooks and the `queryOptions()` factories in `src/data/queries/`. Every file under a patch is keyed by that patch and never goes stale (`staleTime: Infinity`). Its URL carries the content hash from the manifest (`?v=<hash>`), so a data fix within a patch is never hidden by the immutable HTTP cache.
- Schemas stay in `scripts/sync-data/schemas/`, shared with the pipeline. Their inferred types (`Champion`, `Item`, ...) may be imported anywhere.

## Where does new code go

| What | One feature | 2+ features | Generic, no domain |
| --- | --- | --- | --- |
| Component | `features/<f>/components/` | `components/common/` | `components/ui/` |
| Hook | `features/<f>/hooks/` | `hooks/` | `hooks/` |
| Pure logic | `features/<f>/lib/` | `lib/` | `lib/` |
| Game data fetch / hook | `data/` | `data/` | `data/` |
| Other IO (storage, URL) | `features/<f>/services/` | `lib/` | `lib/` |
| Types | `features/<f>/types/` | `types/` | `types/` |
| Route | `routes/` | | |
| Provider, app config | `app/` (feature-scoped providers stay in the feature) | | |

**Promotion rule:** start in the most specific place. When a second feature needs the code, move it to the matching shared layer (`components/common`, `hooks`, `lib`, `types`) in the same PR. Never import it across features instead, and never create shared code for a single consumer.

## Migration map

Moved in #96, #42, #41 and #40 (SCSS to Tailwind utilities and `components/ui`). Nothing is pending.
