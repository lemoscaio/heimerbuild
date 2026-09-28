---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# React Standards

Rules for all code under `src/`. Where a file goes is decided by [`docs/frontend-architecture.md`](../../docs/frontend-architecture.md).

Rules marked **(after #N)** apply once that issue lands; until then, follow the current code.

## File names

- Files and folders are **kebab-case**: `champion-choose/`, `filter-champions.ts`, `champion-card.tsx`, `use-build.ts`.
- Component and type names inside the file stay PascalCase: `export function ChampionCard()`.
- Tests sit next to the file: `filter-champions.test.ts`.
- Enforced by Biome `style/useFilenamingConvention` (kebab-case). Biome checks file names only; folder names are kebab-case by review.

## Imports

- A feature never imports another feature (`src/features/a` → `src/features/b`), no exceptions. Features import only `components/`, `lib/`, `hooks/`, `types/` and `data/`. Details: [import boundaries](../../docs/frontend-architecture.md#import-boundaries).
- `@/` resolves to `src/`: import other layers as `@/data/hooks/use-champions`, not with long `../../..` chains.
- Enforced by Biome `noRestrictedImports` overrides in `biome.json`. A new feature folder needs its own override there (see [import boundaries](../../docs/frontend-architecture.md#import-boundaries)).

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
- One exported component per file. Small, purely visual helpers without state may live in the same file, unexported.
- A wrapper element repeated with identical props becomes a named component.
- A component that grows several independent parts (header, list, footer with their own state) is split with composition.

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
- Forward `className` through `cn()` **(after #40, Tailwind)**.

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

- `ref` is a regular prop; no `forwardRef` **(after #32, React 19)**.

## Styling

- Today: SCSS in `src/styles/`, BEM-like class names.
- **(after #40)** Tailwind 4. Merge classes with `cn()` only; conditional classes use object syntax, never template strings.

```tsx
// Wrong
className={`item-slot ${isEmpty ? "opacity-50" : ""}`}

// Correct
className={cn("item-slot", { "opacity-50": isEmpty })}
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
- Hooks that query export their **query options** next to them, so keys and cache settings live in one place.

```ts
// src/data/hooks/use-champion.ts
export const championQueries = {
	all: () => ["champions"] as const,
	detail: (patch: string, key: string) =>
		queryOptions({
			queryKey: [...championQueries.all(), patch, key],
			queryFn: () => fetchChampion(patch, key),
			staleTime: Number.POSITIVE_INFINITY, // files are immutable per patch
		}),
}

export function useChampion(key: string) { ... }
```

- `queryOptions()` needs TanStack Query v5 **(after #33)**. Until then, export a `queryKeys` object instead.

## Async data: React Query only

- All async data goes through TanStack Query: `useQuery` for reads, `useMutation` for writes.
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

- Route components are thin: read params, compose feature components, nothing else.
- **(after #35)** TanStack Router. Search params (shareable builds, filters) are validated with a Zod schema in `validateSearch`.

## TypeScript

- Strict mode, zero errors. No `any`, no `@ts-ignore`; fix the types.
- Behavior flags go in a typed options object, never positional booleans: `fetchGameData(path, schema, { fetchFn })`.

## Performance

- **(after #32, React Compiler)** Do not add `useMemo`, `useCallback` or `memo` for performance; the compiler handles it. Keep them only where referential identity is part of the contract.
