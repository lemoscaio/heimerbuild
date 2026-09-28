import { createRoute, Link, notFound } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { RoutePending } from "@/components/common/route-pending"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { GameDataUnavailableError } from "@/data/services/game-data"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { useBuild } from "@/features/build-calculator/hooks/use-build"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ItemShop } from "@/features/item-shop/components/item-shop"
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
		return { patch: currentPatch }
	},
	component: ChampionPage,
	pendingComponent: RoutePending,
	errorComponent: RouteError,
	notFoundComponent: ChampionNotFound,
})

function ChampionPage() {
	const { key } = championRoute.useParams()
	const { patch } = championRoute.useLoaderData()
	const build = useBuild(patch, key)

	return (
		<div className="width-container">
			<div className="page-container page-container--champion-page">
				<div className="widthWrapper">
					{build.champion && (
						<main className="champion-page">
							<div className="champion-page__champion-info champion-info">
								<ChampionHeader champion={build.champion} />
								<LevelSelector
									level={build.level}
									onLevelChange={build.setLevel}
								/>
								<ItemSlots items={build.items} onItemClick={build.toggleItem} />
								<ItemShop patch={patch} onItemClick={build.toggleItem} />
								{build.stats && <StatsPanel stats={build.stats} />}
							</div>
						</main>
					)}
				</div>
			</div>
		</div>
	)
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
