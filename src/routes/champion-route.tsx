import { createRoute, Link, notFound } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { buttonVariants } from "@/components/ui/button"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { GameDataUnavailableError } from "@/data/services/game-data"
import { ItemSlotsSkeleton } from "@/features/build-calculator/components/item-slots-skeleton"
import { LevelSelectorSkeleton } from "@/features/build-calculator/components/level-selector-skeleton"
import { StatsPanelSkeleton } from "@/features/build-calculator/components/stats-panel-skeleton"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { WorkbenchPanel } from "@/features/build-calculator/components/workbench-panel"
import { resolveBuildPatch } from "@/features/build-calculator/lib/build-patch"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { ChampionHeaderSkeleton } from "@/features/champions/components/champion-header-skeleton"
import { ItemGridSkeleton } from "@/features/item-shop/components/item-grid-skeleton"
import { ItemList } from "@/features/item-shop/components/item-list"
import { pageWithHeaderRoute } from "./page-with-header-route"
import { APP_TITLE } from "./root-route"

/** Critical half: search, loader, head and fallbacks; the page itself is in `champion-route.lazy.tsx`. */
export const championRoute = createRoute({
	getParentRoute: () => pageWithHeaderRoute,
	path: "/champions/$key",
	validateSearch: buildSearchSchema,
	loaderDeps: ({ search }) => ({ patch: search.patch }),
	loader: async ({
		context: { queryClient },
		params: { key },
		deps: { patch: requestedPatch },
	}) => {
		const manifest = await queryClient.ensureQueryData(
			gameDataQueries.manifest(),
		)
		const { patch, unavailablePatch } = resolveBuildPatch(
			manifest,
			requestedPatch,
		)
		// Items keep their own loading and error state inside the page.
		queryClient.prefetchQuery(gameDataQueries.items(patch))
		try {
			const champion = await queryClient.ensureQueryData(
				gameDataQueries.champion(patch, key),
			)
			return { patch, unavailablePatch, championName: champion.name }
		} catch (error) {
			if (error instanceof GameDataUnavailableError) {
				throw notFound()
			}
			throw error
		}
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.championName} build · ${APP_TITLE}`
					: APP_TITLE,
			},
		],
	}),
	pendingComponent: ChampionPagePending,
	errorComponent: RouteError,
	notFoundComponent: ChampionNotFound,
}).lazy(() =>
	import("./champion-route.lazy").then((module) => module.championLazyRoute),
)

function ChampionPagePending() {
	return (
		<WorkbenchLayout
			role="status"
			build={
				<>
					<span className="sr-only">Loading champion</span>
					<WorkbenchPanel className="flex flex-col gap-3">
						<ChampionHeaderSkeleton />
						<LevelSelectorSkeleton />
					</WorkbenchPanel>
					<WorkbenchPanel>
						<ItemSlotsSkeleton />
					</WorkbenchPanel>
				</>
			}
			shop={
				<ItemList>
					<ItemGridSkeleton />
				</ItemList>
			}
			side={
				<WorkbenchPanel>
					<StatsPanelSkeleton />
				</WorkbenchPanel>
			}
		/>
	)
}

function ChampionNotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 pt-[calc(var(--spacing-header)+--spacing(10))] pb-10 text-white">
			<p>Champion not found.</p>
			<Link to="/" className={buttonVariants({ size: "lg" })}>
				Back to all champions
			</Link>
		</div>
	)
}
