# Frontend Architecture

Target structure for `src/`, grouped by feature instead of by file type. Component and hook rules: [`.claude/rules/react-standards.md`](../.claude/rules/react-standards.md).

> **Migration:** the tree follows this structure since #96 (kebab-case) and #42 (feature folders), and styling is Tailwind and shadcn/ui only since #40. Nothing is pending (see the [Migration map](#migration-map)).

## Target structure

```
src/
├── main.tsx              Vite entry: starts Sentry and the stale-chunk reload, mounts <App /> and global styles, then starts PostHog; nothing else
├── app/                  app shell: App, providers, query client, router (route tree), Sentry and PostHog setup
├── routes/               TanStack Router code routes: one *-route.tsx per route (path, search, loader, head, fallbacks)
├── pages/                one folder per page: composes features into its screens
│   ├── home/             champion browser and recent builds
│   └── champion-build/   the build page: picks the screen (overview, expanded shop, mobile), useChampionBuild, useBuildPage
├── features/             feature slices, never import each other
│   ├── champions/        champion grid, search, champion header and skills
│   ├── build-calculator/ level, item slots, stats panel (on top of lib/stats)
│   ├── item-shop/        item grid, role/stat filters, sorting, tooltips
│   ├── runes/            rune page editor (trees, runes, stat shards) and its summary card
│   └── skills/           skill points: rank rules, suggested order and history, the skills row and Skills tab
├── data/                 game data loading: fetch + Zod parsing, data hooks, query options
│   ├── services/         fetchGameData, fetchManifest, fetchChampion, fetchItems
│   ├── queries/          queryOptions() factories (gameDataQueries)
│   └── hooks/            use-current-patch.ts, use-champions.ts, use-champion.ts, use-items.ts
├── components/
│   ├── ui/               primitives with no domain knowledge: button, slider, tooltip
│   ├── motion/           generic motion primitives (Collapse, Stagger) and motion tokens
│   └── common/           shared app UI: header, logo, app name
├── lib/                  pure, React-free code: stats engine, cn(), formatters, analytics (track, flags)
├── hooks/                hooks used by 2+ features, and generic ones (use-feature-flag.ts)
├── types/                types used by 2+ features (not derivable from a schema)
├── assets/               images imported by code
└── styles/               app.css: Tailwind entry, theme tokens, base styles
```

### Layers

Borrowed from [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/tutorial) (only the layers we need) and [Bulletproof React's one-way dependencies](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md). A layer imports only the layers below it:

```
app → routes → pages → features → shared (components, hooks, lib, types, data)
```

- **Routes only route:** path, search validation, loader, `head`, the pending/error/not-found components and the (lazy) import of the page. No screen composition.
- **Pages compose features** into a screen: `pages/<page>/` holds the page component, its screens and the page-level hooks that wire features together (`useBuildPage`). A page may import features and shared layers, never a route.
- **Features** never import another feature, a page or a route.

### Page anatomy

```
pages/<page>/
├── <page>-page.tsx   the page component the route loads (named export)
├── <part>.tsx        one file per screen (overview-page.tsx) or page-only layout (home-layout.tsx)
└── hooks/            page-level hooks that compose feature hooks with page state
```

A page reads its route through `getRouteApi("<route id>")`, never by importing the route file.

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

- **A feature never imports another feature. No exceptions.** Pages compose features; anything two features need is promoted to a shared layer.
- When two features interact, the page wires them with props and callbacks. Example: the champion build page calls `useBuildPage()` (its own hook, on top of `useChampionBuild`, which composes the domain hooks of four features; see [Build composition](#build-composition)) and its screens pass `build.addItem` to `ItemShop` (item-shop) as `onItemAdd`; the shop never knows about the build.
- Features may import only the shared layers: `components/{ui,common}`, `lib`, `hooks`, `types`, `data`. Never `pages/` or `routes/`.
- Pages may import features and the shared layers, never `routes/`. Routes import pages.
- Shared layers never import from `features/`, `pages/` or `routes/`.
- CI enforces this with Biome `noRestrictedImports` overrides in `biome.json`: one override covers every feature (it bans `@/features/**`, any `../../` climb out of the feature, `pages/` and `routes/`), one covers `pages/`, one covers the shared layers. A feature imports its own files relatively (`../lib/x`), one folder level deep. **A new feature needs no config.**

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
- Schemas stay in `scripts/sync-data/schemas/`, shared with the pipeline. Their inferred types (`Champion`, `Item`, ...) may be imported anywhere, through the `@schemas/` alias (`@schemas/item`).

## Build composition

The build (everything the user builds for a champion) is **composed from one controlled hook per domain**. Domains never import each other: the page layer wires them, and their values only meet in the stats and in each saved edit.

```
pages/champion-build/hooks/
├── use-url-build-source.ts   the URL as the build source: writes the search, records recent builds
├── use-champion-build.ts     data hooks + domain hooks + stats on a build source (the composer)
└── use-build-page.ts         useChampionBuild + view, tab, item selection, previews, form switch
```

| Domain | Hook | Feature | Value in the source |
| --- | --- | --- | --- |
| Champion state | `useChampionState` (level, form) | `champions` | `level`, `form` |
| Skills | `useSkills` (ranks, order, kept points) | `skills` | `skills` |
| Items | `useBuildItems` (chosen items, full-build notice, announcement, item events) | `build-calculator` | `itemIds` |
| Rune page | `useRunePage` (checked page, stat shards) | `runes` | `runes` |

- **Controlled domain hooks.** Each takes `value` + `onChange` and gets its data injected (champion, items, runes). It knows nothing about the URL, the browser history or the other domains, and keeps the given value while its data loads. Its rules live in the feature's `lib/` as pure functions with unit tests (`readRunePage`, `readBuildItems`, `readChampionState`); the hook stays thin and is covered by the e2e flows.
- **One build source.** `BuildSource` = `{ state, update(patch, navigation) }` (`features/build-calculator/types/build-source.ts`). `useUrlBuildSource` is the only place that writes the URL search (with `toBuildSearch`) and records recent builds; it also carries the page's view and tab, which are never recorded. A later source per build instance (an opponent, a comparison) plugs into the same composer.
- **The composer.** `useChampionBuild({ patch, championKey, source })` reads the game data, injects it, and saves each domain's change together with the checked values of every domain, so an edit still cleans a link's unknown items or invalid runes. It holds the explicit browser-history table (items push, so Back undoes them; champion state, skills and runes replace) and the cross-domain links (a level change also saves the skill points that level keeps or restores).
- **Pure stats.** `computeBuildStats({ champion, level, form, items, shards, ranks })` (`lib/stats/`). Every "what if" is `whatIf(change)`: a shop item preview (`items`), the other form (`form`), the next rank (`ranks`), the stats without runes (`shards: []`).
- **Grouped by domain.** The build reads `build.championState.level`, `build.skills.ranks`, `build.items.add`, `build.runePage.selection`. Page screens (overview, expanded shop, mobile) receive the page object from `useBuildPage`; feature components receive props, never the whole build.
- **Adding a domain** (summoner spells, conditions): a controlled hook in its feature with its rules in `lib/`, its value in `BuildValues` and `buildSearchSchema`, one entry in the composer (inject the data, save its `onChange` with its history entry) and, when it changes stats, one more `computeBuildStats` input.

## Where does new code go

| What | One feature | 2+ features | Generic, no domain |
| --- | --- | --- | --- |
| Component | `features/<f>/components/` | `components/common/` | `components/ui/` |
| Animation | `<name>.motion.tsx` next to the component | `<name>.motion.tsx` | `components/motion/` |
| Hook | `features/<f>/hooks/` | `hooks/` | `hooks/` |
| Pure logic | `features/<f>/lib/` | `lib/` | `lib/` |
| Game data fetch / hook | `data/` | `data/` | `data/` |
| Other IO (storage, URL) | `features/<f>/services/` | `lib/` | `lib/` |
| Types | `features/<f>/types/` | `types/` | `types/` |
| Page: its screens and page-level hooks | `pages/<page>/` | | |
| Route (path, search, loader, head, fallbacks) | `routes/` | | |
| Provider, app config | `app/` (feature-scoped providers stay in the feature) | | |

**Promotion rule:** start in the most specific place. When a second feature needs the code, move it to the matching shared layer (`components/common`, `hooks`, `lib`, `types`) in the same PR. Never import it across features instead, and never create shared code for a single consumer.

## Migration map

Moved in #96, #42, #41 and #40 (SCSS to Tailwind utilities and `components/ui`). Nothing is pending.
