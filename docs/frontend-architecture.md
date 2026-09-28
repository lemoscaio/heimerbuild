# Frontend Architecture

Target structure for `src/`, grouped by feature instead of by file type. Component and hook rules: [`.claude/rules/react-standards.md`](../.claude/rules/react-standards.md).

> **Migration:** the current tree does not match this yet. **New code follows the target structure.** Existing code moves in #96 (kebab-case rename) and #42 (feature folders); see [Migration map](#migration-map).

## Target structure

```
src/
├── main.tsx              Vite entry: mounts <App /> and global styles, nothing else
├── app/                  app shell: App, providers, query client, router, root layouts
├── routes/               thin route components (TanStack Router route files after #35)
├── features/             feature slices, never import each other
│   ├── champions/        champion grid, search, champion header and skills
│   ├── build-calculator/ level, item slots, stats panel (on top of lib/stats)
│   └── item-shop/        item grid, role/stat filters, sorting, tooltips
├── data/                 game data loading: fetch + Zod parsing, data hooks, query options
│   ├── services/         fetchGameData, fetchManifest, fetchChampion, fetchItems
│   └── hooks/            use-champions.ts, use-champion.ts, use-items.ts
├── components/
│   ├── ui/               primitives with no domain knowledge: button, slider, tooltip
│   └── common/           shared app UI: header, logo, app name
├── lib/                  pure, React-free code: stats engine, cn(), formatters
├── hooks/                hooks used by 2+ features
├── types/                types used by 2+ features (not derivable from a schema)
├── assets/               images imported by code
└── styles/               global SCSS (one CSS entry after #40, Tailwind)
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

- `src/data` is the only place that fetches and parses game data (`fetchGameData(path, schema)`) and exposes it through hooks and query options.
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

| Current | Target | Issue |
| --- | --- | --- |
| `src/main.tsx` | stays | |
| `src/App.tsx` | `src/app/app.tsx` (named export) | #96, #42 |
| `src/routes/Router.tsx` | `src/app/router.tsx`, then TanStack Router route files | #42, #35 |
| `src/layouts/PageWithHeader/` | `src/app/layouts/page-with-header.tsx` | #42 |
| `src/pages/ChampionChoose/index.tsx` | `src/routes/` (thin) + `features/champions/components/` | #42 |
| `src/pages/ChampionChoose/components/*` | `features/champions/components/` | #42 |
| `src/pages/ChampionChoose/filterChampions.ts` (+ test) | `features/champions/lib/filter-champions.ts` | #42 |
| `src/pages/ChampionDetails/index.tsx` | `src/routes/` (thin) + `features/build-calculator`, `features/item-shop`, `features/champions` | #41, #42 |
| `src/pages/ChampionDetails/components/ChampionSkills/` | `features/champions/components/champion-skills.tsx` | #42 |
| `src/pages/ChampionDetails/legacyStats.ts` | deleted by the stats engine (PR 93) | #18 |
| `src/lib/stats/` (PR 93, not on `main` yet) | stays; files renamed to kebab-case | #96 |
| `src/components/AppName`, `Header`, `MainPageLogo` | `components/common/` | #42 |
| `src/components/SearchContainer` | `features/champions/components/` (only consumer) | #42 |
| `src/hooks/api/usePatchQuery.ts` | `data/hooks/`, replaced by query options | #42, #33 |
| `src/hooks/api/useGetChampions`, `useGetChampionDetails`, `useGetItems` | `data/hooks/use-champions.ts`, `use-champion.ts`, `use-items.ts` | #42 |
| `src/services/gameData.ts` (+ test) | `data/services/game-data.ts` | #42 |
| `src/services/api/index.ts` (QueryClient) | `src/app/query-client.ts` | #42 |
| `src/utils/statsInfo.ts` | `features/build-calculator/lib/` | #42 |
| `src/utils/rolesInfo.ts` | `features/item-shop/lib/` | #42 |
| `src/types/stats.ts` (empty) | deleted | #37 |
| `src/assets/` | stays | |
| `src/styles/` | replaced by Tailwind | #40 |

Until a folder is migrated, do not add new files to `src/pages/`, `src/hooks/api/`, `src/services/` or `src/utils/`: put new code in its target location.
