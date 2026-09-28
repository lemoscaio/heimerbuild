import { createRoute, Link, notFound, useRouter } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { GameDataUnavailableError } from "@/data/services/game-data"
import { BuildSkeleton } from "@/features/build-calculator/components/build-skeleton"
import { CopyBuildLink } from "@/features/build-calculator/components/copy-build-link"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { useBuild } from "@/features/build-calculator/hooks/use-build"
import { resolveBuildPatch } from "@/features/build-calculator/lib/build-patch"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ChampionHeaderSkeleton } from "@/features/champions/components/champion-header-skeleton"
import { ItemGridSkeleton } from "@/features/item-shop/components/item-grid-skeleton"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { pageWithHeaderRoute } from "./page-with-header-route"

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
			await queryClient.ensureQueryData(gameDataQueries.champion(patch, key))
		} catch (error) {
			if (error instanceof GameDataUnavailableError) {
				throw notFound()
			}
			throw error
		}
		return { patch, unavailablePatch }
	},
	component: ChampionPage,
	pendingComponent: ChampionPagePending,
	errorComponent: RouteError,
	notFoundComponent: ChampionNotFound,
})

function ChampionPage() {
	const { key } = championRoute.useParams()
	const { patch, unavailablePatch } = championRoute.useLoaderData()
	const search = championRoute.useSearch()
	const navigate = championRoute.useNavigate()
	const router = useRouter()
	const build = useBuild({
		patch,
		championKey: key,
		search,
		onSearchChange: (nextSearch, { replace }) =>
			navigate({ search: nextSearch, replace, resetScroll: false }),
	})
	const buildHref = router.buildLocation({
		to: championRoute.fullPath,
		params: { key },
		search: build.shareSearch,
	}).href

	return (
		<div className="width-container">
			<div className="page-container page-container--champion-page">
				<div className="widthWrapper">
					{build.champion && (
						<main className="champion-page">
							<div className="champion-page__champion-info champion-info">
								<ChampionHeader champion={build.champion}>
									<CopyBuildLink href={buildHref} />
								</ChampionHeader>
								{unavailablePatch && (
									<PatchNotice
										requestedPatch={unavailablePatch}
										patch={patch}
									/>
								)}
								<LevelSelector
									level={build.level}
									onLevelChange={build.setLevel}
								/>
								<ItemSlots
									items={build.items}
									onRemoveItem={build.removeItem}
									notice={build.notice}
								/>
								<ItemShop patch={patch} onItemClick={build.addItem} />
								{build.stats && <StatsPanel stats={build.stats} />}
							</div>
						</main>
					)}
				</div>
			</div>
		</div>
	)
}

function ChampionPagePending() {
	return (
		<div className="width-container">
			<div className="page-container page-container--champion-page">
				<main className="champion-page" role="status">
					<span className="sr-only">Loading champion</span>
					<div className="champion-page__champion-info champion-info">
						<ChampionHeaderSkeleton />
						<BuildSkeleton />
						<div className="champion-info__items items">
							<div className="items__list">
								<ItemGridSkeleton />
							</div>
						</div>
					</div>
				</main>
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
