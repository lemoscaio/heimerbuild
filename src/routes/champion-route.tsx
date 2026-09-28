import { createRoute, Link, notFound } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { RoutePending } from "@/components/common/route-pending"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { GameDataUnavailableError } from "@/data/services/game-data"
import { ChampionDetails } from "@/features/build-calculator/components/champion-details"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { pageWithHeaderRoute } from "./page-with-header-route"

export const championRoute = createRoute({
	getParentRoute: () => pageWithHeaderRoute,
	path: "/champions/$key",
	// Parsed so shared links are typed; the page reads it once #48 lands.
	validateSearch: buildSearchSchema,
	loader: async ({ context: { queryClient }, params: { key } }) => {
		const { currentPatch } = await queryClient.ensureQueryData(
			gameDataQueries.manifest(),
		)
		// Items keep their own loading and error state inside the page.
		queryClient.prefetchQuery(gameDataQueries.items(currentPatch))
		try {
			await queryClient.ensureQueryData(
				gameDataQueries.champion(currentPatch, key),
			)
		} catch (error) {
			if (error instanceof GameDataUnavailableError) {
				throw notFound()
			}
			throw error
		}
	},
	component: ChampionPage,
	pendingComponent: RoutePending,
	errorComponent: RouteError,
	notFoundComponent: ChampionNotFound,
})

function ChampionPage() {
	const { key } = championRoute.useParams()

	return <ChampionDetails championKey={key} />
}

function ChampionNotFound() {
	return (
		<div className="page-container route-status load-error-container">
			<p>Champion not found.</p>
			<Link to="/" className="load-button">
				Back to all champions
			</Link>
		</div>
	)
}
