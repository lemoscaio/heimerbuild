# Frontend Architecture

Target structure for `src/`, grouped by feature instead of by file type. Component and hook rules: [`.claude/rules/react-standards.md`](../.claude/rules/react-standards.md).

> **Migration:** the current tree does not match this yet. **New code follows the target structure.** Existing code moves in #96 (kebab-case rename) and #42 (feature folders); see [Migration map](#migration-map).

## Target structure

```
src/
├── main.tsx              Vite entry: mounts <App /> and global styles, nothing else
├── app/                  app shell: App, providers, query client, router, root layouts
├── routes/               thin route components (TanStack Router route files after #35)
├── modules/              feature slices
│   ├── game-data/        manifest + per-patch fetching, Zod parsing, query options
│   ├── champions/        champion grid, search, champion header and skills
│   ├── build-calculator/ level, item slots, stats panel (on top of lib/stats)
│   └── item-shop/        item grid, role/stat filters, sorting, tooltips
├── components/
│   ├── ui/               primitives with no domain knowledge: button, slider, tooltip
│   └── common/           shared app UI: header, logo, app name
├── lib/                  pure, React-free code: stats engine, cn(), formatters
├── hooks/                hooks used by 2+ modules
├── types/                types used by 2+ modules (not derivable from a schema)
├── assets/               images imported by code
└── styles/               global SCSS (one CSS entry after #40, Tailwind)
```

### Module anatomy

```
modules/<feature>/
├── components/   UI used only by this feature
├── hooks/        use-*.ts, with their query options
├── services/     IO: fetchers, storage, URL encoding
├── lib/          pure functions for this feature (tested with bun test)
└── types/        feature-only types
```

- Create only the folders a module needs.
- A component is one file (`champion-card.tsx`). It becomes a folder (`champion-card/index.tsx` plus parts) only when it owns sub-components or hooks.
- No barrel files re-exporting a folder; import the file directly.
- Feature modules do not import each other. Routes compose them; anything two modules need is promoted (see below). Every module may import `game-data`, `lib`, `components`, `hooks` and `types`.
- `lib/` (root or module) never imports React, so it stays trivially testable.

### Game data boundary

- `modules/game-data` is the only place that fetches and parses game data (`fetchGameData(path, schema)`).
- Schemas stay in `scripts/sync-data/schemas/`, shared with the pipeline. Their inferred types (`Champion`, `Item`, ...) may be imported anywhere.

## Where does new code go

| What | One feature | 2+ features | Generic, no domain |
| --- | --- | --- | --- |
| Component | `modules/<f>/components/` | `components/common/` | `components/ui/` |
| Hook | `modules/<f>/hooks/` | `hooks/` | `hooks/` |
| Pure logic | `modules/<f>/lib/` | `lib/` | `lib/` |
| IO / fetching | `modules/<f>/services/` | `modules/game-data/services/` (game data) | `lib/` |
| Types | `modules/<f>/types/` | `types/` | `types/` |
| Route | `routes/` | | |
| Provider, app config | `app/` (feature-scoped providers stay in the module) | | |

**Promotion rule:** start in the most specific place. When a second consumer appears, move the code up one level in the same PR. Never create shared code for a single consumer.

## Migration map

| Current | Target | Issue |
| --- | --- | --- |
| `src/main.tsx` | stays | |
| `src/App.tsx` | `src/app/app.tsx` | #96, #42 |
| `src/routes/Router.tsx` | `src/app/router.tsx`, then TanStack Router route files | #42, #35 |
| `src/layouts/PageWithHeader/` | `src/app/layouts/page-with-header.tsx` | #42 |
| `src/pages/ChampionChoose/index.tsx` | `src/routes/` (thin) + `modules/champions/components/` | #42 |
| `src/pages/ChampionChoose/components/*` | `modules/champions/components/` | #42 |
| `src/pages/ChampionChoose/filterChampions.ts` (+ test) | `modules/champions/lib/filter-champions.ts` | #42 |
| `src/pages/ChampionDetails/index.tsx` | `src/routes/` (thin) + `modules/build-calculator`, `modules/item-shop`, `modules/champions` | #41, #42 |
| `src/pages/ChampionDetails/components/ChampionSkills/` | `modules/champions/components/champion-skills.tsx` | #42 |
| `src/pages/ChampionDetails/legacyStats.ts` | deleted by the stats engine (PR 93) | #18 |
| `src/lib/stats/` (PR 93, not on `main` yet) | stays; files renamed to kebab-case | #96 |
| `src/components/AppName`, `Header`, `MainPageLogo` | `components/common/` | #42 |
| `src/components/SearchContainer` | `modules/champions/components/` (only consumer) | #42 |
| `src/hooks/api/usePatchQuery.ts` | `modules/game-data/hooks/`, replaced by query options | #42, #33 |
| `src/hooks/api/useGetChampions`, `useGetChampionDetails`, `useGetItems` | `modules/game-data/hooks/use-champions.ts`, `use-champion.ts`, `use-items.ts` | #42 |
| `src/services/gameData.ts` (+ test) | `modules/game-data/services/game-data.ts` | #42 |
| `src/services/api/index.ts` (QueryClient) | `src/app/query-client.ts` | #42 |
| `src/utils/statsInfo.ts` | `modules/build-calculator/lib/` | #42 |
| `src/utils/rolesInfo.ts` | `modules/item-shop/lib/` | #42 |
| `src/types/stats.ts` (empty) | deleted | #37 |
| `src/assets/` | stays | |
| `src/styles/` | replaced by Tailwind | #40 |

Until a folder is migrated, do not add new files to `src/pages/`, `src/hooks/api/`, `src/services/` or `src/utils/`: put new code in its target location.
