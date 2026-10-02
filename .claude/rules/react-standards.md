---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# React Standards

Rules for all code under `src/`. Where a file goes is decided by [`docs/frontend-architecture.md`](../../docs/frontend-architecture.md).

Rules marked **(after #N)** apply once that issue lands; until then, follow the current code.

## File names

- Files and folders are **kebab-case**: `champion-choose/`, `filter-champions.ts`, `champion-card.tsx`, `use-build-items.ts`.
- Component and type names inside the file stay PascalCase: `export function ChampionCard()`.
- Tests sit next to the file: `filter-champions.test.ts`.
- Enforced by Biome `style/useFilenamingConvention` (kebab-case). Biome checks file names only; folder names are kebab-case by review.

## Imports

- Layers import one way: `app → routes → pages → features → shared` ([layers](../../docs/frontend-architecture.md#layers)).
- A feature never imports another feature (`src/features/a` → `src/features/b`), no exceptions, nor a page or a route. Features import only `components/`, `lib/`, `hooks/`, `types/` and `data/`. Details: [import boundaries](../../docs/frontend-architecture.md#import-boundaries).
- `@/` resolves to `src/`: import other layers as `@/data/hooks/use-champions`, not with long `../../..` chains.
- `@schemas/` resolves to `scripts/sync-data/schemas/`: import the game data schemas and their types as `@schemas/item`.
- Enforced by Biome `noRestrictedImports` overrides in `biome.json`. A feature imports its own files relatively (`../lib/x`); one override covers every feature, so a new feature folder needs no config (see [import boundaries](../../docs/frontend-architecture.md#import-boundaries)).

## Exports and declarations

- **Named exports** only: `export function ChampionCard()`. No `export default` (Biome `style/noDefaultExport`); only tool entry points that require one (`vite.config.ts`, `worker/index.ts`) are exempt.
- No barrel files: import the file that defines the thing, never a folder `index.ts` re-export list.
- **`function` declarations** for components, hooks and helpers. No top-level `const X = () => ...`.
- Arrow functions are fine for inline callbacks (`onClick`, `map`, `useCallback`).

```tsx
// Wrong
const ChampionCard = ({ champion }: ChampionCardProps) => { ... }
export default ChampionCard

// Correct
export function ChampionCard({ champion }: ChampionCardProps) { ... }
```

## Components

- **No render functions.** Extract a component instead; `renderX()` helpers redeclare on every render and hide props.
- One exported component per file. Small, purely visual helpers without state may live in the same file, unexported. A component's loading skeleton may share its file when both use the same layout (`ChampionCard` + `ChampionCardSkeleton`), unless the skeleton sits in a different chunk on purpose (route pending components).
- A wrapper element repeated with identical props becomes a named component.
- A component that grows several independent parts (header, list, footer with their own state) is split with composition.

## Components assemble, features live in hooks and `lib/`

- A `.tsx` component **assembles and presents** the components it is made of. It does not carry feature logic.
- A **real feature** (rules of its own: parsing, suggestion building, stat math) lives in its own hook (`use-*.ts`) or pure `lib/` file, where it can be read and tested alone.
- **Data hooks never know presentation.** A hook that carries a domain concept (`useBuildItems`: the chosen items) returns state and actions only: no component-shaped prop bundles, no UI state. When a screen needs UI state (view, selection, layout), a new hook composes the data hook with it (`useBuildPage` = `useChampionBuild` + view and selection). One concept per hook, assembled like lego.
- **Don't extract the trivial.** A one-line derivation, a single `useState` or a helper with one caller that reads fine inline stays inline.
- **More files is not more complexity.** Split when each piece reads on its own; judge readability, not line or file counts.

```tsx
// Wrong
function ItemShop() {
	const renderFilters = () => <div className="filters">...</div>
	return <section>{renderFilters()}</section>
}

// Correct
function ItemFilters() {
	return <div className="filters">...</div>
}

export function ItemShop() {
	return <section><ItemFilters /></section>
}
```

## Props

- Props are a `type` (not `interface`), intersected with `React.ComponentProps<...>` when the component wraps an element. Never redeclare `className`, `onClick` and other native props.
- Destructure custom props before spreading `...props` onto the element, so they never leak to the DOM.
- Forward `className` through `cn()` (`@/lib/cn`).

```tsx
type StatRowProps = {
	stat: StatName
	value: number
} & React.ComponentProps<"li">

export function StatRow({ stat, value, className, ...props }: StatRowProps) {
	return (
		<li className={cn("flex justify-between", className)} {...props}>
			...
		</li>
	)
}
```

- `ref` is a regular prop; no `forwardRef` (React 19).

## Styling

- Tailwind 4 utilities; theme tokens (palette, fonts, header height) live in `@theme` in `src/styles/app.css`. Prefer the Tailwind spacing, font-size and radius scales over arbitrary values.
- Merge classes with `cn()` only; conditional classes use object syntax, never template strings. Biome sorts classes (`useSortedClasses`).
- UI primitives are shadcn/ui components (Base UI) in `src/components/ui/`, added with `bunx shadcn@latest add <name>` and then adapted to the rules here (named exports, `@/lib/cn`).
- `src/styles/app.css` is the only stylesheet: global rules (base styles, custom utilities such as `scrollbar-purple`) go there, never in a new CSS file.

```tsx
// Wrong
className={`size-10 rounded-sm ${isEmpty ? "opacity-50" : ""}`}

// Correct
className={cn("size-10 rounded-sm", { "opacity-50": isEmpty })}
```

## Conditional rendering

- Prefer `&&` over `cond ? <X /> : null`. Use a ternary only when both branches render something.
- Always coerce numbers with `!!` so `0` is never rendered.

```tsx
{!!items.length && <ItemList items={items} />}
```

## Hooks

- A hook that has state, calls `useQuery`/`useMutation` or branches goes in a co-located `hooks/` folder as `use-*.ts`, even with a single consumer. Never a catch-all `hooks.ts`.
- Trivial stateless wrappers may stay inline.
- Values kept in `localStorage` go through `useLocalStorage(key, { schema, defaultValue })` (`src/hooks/`); code outside a component uses `readLocalStorage` / `writeLocalStorage` (`src/lib/local-storage.ts`). Both validate with Zod and never throw.
- Query options live in one `queryOptions()` factory object per data source, so keys and cache settings live in one place. Hooks, route loaders and prefetches all use the factory; nobody writes a query key by hand. Game data uses `gameDataQueries` in `src/data/queries/`.

```ts
// src/data/queries/game-data-queries.ts
export const gameDataQueries = {
	all: () => ["game-data"] as const,
	patch: (patch: string) => [...gameDataQueries.all(), patch] as const,
	champion: (patch: string, key: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "champions", key],
			queryFn: () => fetchChampion(patch, key),
			staleTime: Number.POSITIVE_INFINITY, // files are immutable per patch
		}),
}

// src/data/hooks/use-champion.ts
export function useChampion(patch: string | undefined, key: string | undefined) {
	return useQuery({
		...gameDataQueries.champion(patch ?? "", key ?? ""),
		enabled: patch !== undefined && key !== undefined,
	})
}
```

- No wrapper hooks around `useQuery` that reshape its result (custom `isLoading`/`refetch` facades). Return the query result as is.

## Build composition

The champion build is composed from one hook per domain ([Build composition](../../docs/frontend-architecture.md#build-composition)).

- A **domain hook** (`useChampionState`, `useSkills`, `useBuildItems`, `useRunePage`) is controlled: `value` + `onChange`, with its data injected. It never reads the URL, records history or recent builds, or imports another domain; a dependency between domains is passed in by the composer.
- Only the **build source** writes the URL and records recent builds (`useUrlBuildSource`); only the **composer** (`useChampionBuild`) decides the browser history of an edit and links domains (level → skills).
- Stats come only from `computeBuildStats`; a preview is `whatIf(change)`, never a new stats helper.
- The build is grouped by domain (`build.items.add`). Screens take the page object; feature components take slices as props, never the whole build.

## Async data: React Query only

- All async data goes through TanStack Query: `useQuery` for reads, `useMutation` for writes.
- That includes client-only actions whose pending, success or error the UI shows (copying a link: `useCopyLink` is a `useMutation`). Never hand-roll async status with `useState`.
- Several queries behind one view become one `QueryStatus` (`"pending" | "error" | "success"`) for the component, not a set of booleans.
- Never hand-roll `fetch` + `useState` loading/error flags + `useEffect`. React Query handles loading, errors, retries, dedup and caching.
- Drive on-demand queries with `enabled`, not imperative calls.
- One `QueryClient`, created at module level in `src/app/`, never inside a component.

```tsx
// Banned
const [data, setData] = useState<Champion>()
const [isLoading, setIsLoading] = useState(true)
useEffect(() => {
	fetch(url).then((r) => r.json()).then(setData).finally(() => setIsLoading(false))
}, [url])

// Correct
const { data, isPending, isError } = useQuery(championQueries.detail(patch, key))
```

## Data validation: Zod at the boundary

- Every external payload (game data JSON, URL search params, later Clerk metadata) is parsed with a Zod schema where it enters the app. Past that point, trust the types.
- Game data is fetched only through `fetchGameData(path, schema)` in `src/data/`.
- Types come from `z.infer` on the schema; never hand-write a duplicate shape, never `as`-cast fetched data.
- Game data schemas live in `scripts/sync-data/schemas/`, shared with the pipeline.
- Code that reaches the browser (`src/**` and the shared schemas) uses `zod/mini` (`import * as z from "zod/mini"`, checks via `.check(z.regex(...))`, wrappers such as `z.optional()`, `z.catch()`, `z._default()`): classic `zod` costs ~16 kB gzip more. Its issues carry generic messages ("Invalid input") but keep `path` and `code`. Pipeline-only schemas and the Worker may stay on classic `zod`.

## Context

- Provider and hook in the same file; export only those two, **never the raw context**.
- The hook throws when used outside its provider.

```tsx
const BuildContext = createContext<BuildContextValue | null>(null)

export function useBuildContext() {
	const context = useContext(BuildContext)
	if (!context) {
		throw new Error("useBuildContext must be used within BuildProvider")
	}
	return context
}

export function BuildProvider({ children }: React.PropsWithChildren) {
	...
	return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>
}
```

## Routing

- Routes only route: path, search validation, loader, `head`, the pending/error/not-found components and the import of the page. The page itself lives in `src/pages/<page>/` and composes the features ([layers](../../docs/frontend-architecture.md#layers)).
- TanStack Router with code-based routes. Each route lives in `src/routes/<name>-route.tsx` (`createRoute` + `component: <Page>` from `src/pages/`), and `src/app/router.tsx` assembles the tree.
- A route whose page is heavy (the champion page) splits in two: `<name>-route.tsx` keeps `createRoute` with search, loader, `head` and the pending/error/not-found components, and `<name>-route.lazy.tsx` only binds the page (`createLazyRoute(<full route id>)({ component })`), attached with `.lazy()`. Links preload on intent (`defaultPreload: "intent"`).
- A page reads its route's params, search and loader data through `getRouteApi("<full route id>")`, never by importing the route file.
- A page with several screens keeps one file per screen in its page folder (`src/pages/champion-build/overview-page.tsx`, `expanded-shop-page.tsx`, `mobile-build-page.tsx`); the page component picks one. Screens compose features, so they live in `pages/`, never in a feature or a route.
- Page-level hooks that compose features' hooks, and add page state (view, selection), live in the page's `hooks/` (`useChampionBuild` and `useBuildPage` in `src/pages/champion-build/hooks/`).
- Loaders load data through the `queryOptions()` factories (`queryClient.ensureQueryData(gameDataQueries...)`); components then read the same queries from the cache.
- Every data route sets `pendingComponent` and `errorComponent`, and `notFoundComponent` when a param can point at nothing.
- Search params (shareable builds, filters) are validated with a Zod schema in `validateSearch`. Invalid values are dropped with `z.catch()`, so a bad link never shows an error page.

## TypeScript

- Strict mode, zero errors. No `any`, no `@ts-ignore`; fix the types.
- Behavior flags go in a typed options object, never positional booleans: `fetchGameData(path, schema, { fetchFn })`.

## Motion

Animations use Motion (`motion/react`) through `m` components; `MotionProvider` (`src/app/`) loads the features lazily and sets the default transition.

- **Generic motion** lives in `src/components/motion/`: `Collapse` (height + fade open/close) and `Stagger` / `Stagger.Item`. Add a primitive only when a PR uses it.
- **Component motion** lives next to its component in `<name>.motion.tsx`, exporting components named by role (`ChampionListReveal`, `ChampionCardReveal`). They may use `m.*` or compose the primitives; recreate something small rather than bend a generic one.
- **Nowhere else imports Motion.** The `biome-plugins/motion-imports.grit` plugin enforces it; its allow-list lives in `biome.json`.
- **No wrapper elements:** primitives take a Base UI style `render` prop (`<Collapse render={<section />}>` animates the `<section>` itself). A plain wrapper `div` is fine inside a `.motion.tsx` only when it is purely visual.
- **Tokens only:** durations, easing and stagger come from `src/components/motion/tokens.ts` (`fast` 0.15 s, `base` 0.2 s, `slow` 0.3 s). Nothing lasts longer than 300 ms; tests fail on a longer token or a numeric `duration` / `delay` in a motion file. Most components pass no `transition` and get `base`.
- Reduced motion makes every change instant: the provider's default becomes `transitions.instant`, and primitives drop their own timing.
- Feature components keep markup and data; the motion lives in their `.motion.tsx`.

```tsx
// champion-list.motion.tsx
export function ChampionListReveal(props: React.ComponentProps<typeof Collapse>) {
	return <Collapse render={<section />} {...props} />
}

// champion-browser.tsx
<ChampionListReveal open={expanded} aria-label="Champions">...</ChampionListReveal>
```

## Performance

- The React Compiler is on (`vite.config.ts`). Do not add `useMemo`, `useCallback` or `memo` for performance; the compiler handles it. Keep them only where referential identity is part of the contract.
