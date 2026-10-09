import { createRoute } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { Skeleton } from "@/components/ui/skeleton"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { PRODUCT_NAME } from "@/lib/product-name"
import { MOCKUP_BUILDS } from "@/pages/stats-mockups/lib/mockup-builds"
import { readMockupSearch } from "@/pages/stats-mockups/lib/mockup-search"
import { pageWithHeaderRoute } from "./page-with-header-route"

/** Prototype for issue 428 (not for merge): Stats panel options on real builds. */
export const statsMockupsRoute = createRoute({
	getParentRoute: () => pageWithHeaderRoute,
	path: "/prototypes/stats-panel",
	validateSearch: readMockupSearch,
	loaderDeps: ({ search }) => ({ build: search.build ?? "jinx" }),
	loader: async ({ context: { queryClient }, deps: { build } }) => {
		const { currentPatch } = await queryClient.ensureQueryData(
			gameDataQueries.manifest(),
		)
		// The other builds' champions load in the background, so switching never waits.
		for (const { id, championKey } of Object.values(MOCKUP_BUILDS)) {
			if (id !== build) {
				queryClient.prefetchQuery(
					gameDataQueries.champion(currentPatch, championKey),
				)
			}
		}
		await Promise.all([
			queryClient.ensureQueryData(
				gameDataQueries.champion(
					currentPatch,
					MOCKUP_BUILDS[build].championKey,
				),
			),
			queryClient.ensureQueryData(gameDataQueries.items(currentPatch)),
			queryClient.ensureQueryData(gameDataQueries.runes(currentPatch)),
		])
	},
	head: () => ({
		meta: [
			{ title: `Stats panel mockups · ${PRODUCT_NAME}` },
			{ name: "robots", content: "noindex" },
		],
	}),
	pendingComponent: StatsMockupsPending,
	errorComponent: RouteError,
}).lazy(() =>
	import("./stats-mockups-route.lazy").then(
		(module) => module.statsMockupsLazyRoute,
	),
)

function StatsMockupsPending() {
	return (
		<div className="mx-auto flex max-w-360 flex-col gap-4 px-4 pt-[calc(var(--spacing-header)+--spacing(6))]">
			<Skeleton className="h-10 w-80" />
			<Skeleton className="h-96 w-full" />
		</div>
	)
}
