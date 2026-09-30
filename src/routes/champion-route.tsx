import { createRoute, Link, notFound, useRouter } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { buttonVariants } from "@/components/ui/button"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { GameDataUnavailableError } from "@/data/services/game-data"
import { CopyBuildLink } from "@/features/build-calculator/components/copy-build-link"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { ItemSlotsSkeleton } from "@/features/build-calculator/components/item-slots-skeleton"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { LevelSelectorSkeleton } from "@/features/build-calculator/components/level-selector-skeleton"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { RunesPlaceholder } from "@/features/build-calculator/components/runes-placeholder"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { StatsPanelSkeleton } from "@/features/build-calculator/components/stats-panel-skeleton"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { WorkbenchPanel } from "@/features/build-calculator/components/workbench-panel"
import { useBuild } from "@/features/build-calculator/hooks/use-build"
import { resolveBuildPatch } from "@/features/build-calculator/lib/build-patch"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ChampionHeaderSkeleton } from "@/features/champions/components/champion-header-skeleton"
import { ItemGridSkeleton } from "@/features/item-shop/components/item-grid-skeleton"
import { ItemList } from "@/features/item-shop/components/item-list"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { track } from "@/lib/analytics/analytics"
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
		build.champion && (
			<WorkbenchLayout
				actions={
					<CopyBuildLink
						layout="inline"
						href={buildHref}
						onCopied={() =>
							track("build_link_copied", {
								champion: key,
								level: build.level,
								itemsCount: build.items.length,
							})
						}
					/>
				}
				build={
					<>
						<WorkbenchPanel className="flex flex-col gap-3">
							<ChampionHeader champion={build.champion} />
							{unavailablePatch && (
								<PatchNotice requestedPatch={unavailablePatch} patch={patch} />
							)}
							<LevelSelector
								level={build.level}
								onLevelChange={build.setLevel}
							/>
						</WorkbenchPanel>
						<WorkbenchPanel>
							<ItemSlots
								items={build.items}
								onRemoveItem={build.removeItem}
								notice={build.notice}
							/>
						</WorkbenchPanel>
						<RunesPlaceholder />
					</>
				}
				shop={<ItemShop patch={patch} onItemClick={build.addItem} />}
				stats={
					<WorkbenchPanel>
						{build.stats && <StatsPanel stats={build.stats} />}
					</WorkbenchPanel>
				}
			/>
		)
	)
}

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
			stats={
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
