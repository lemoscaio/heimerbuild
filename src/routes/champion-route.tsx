import { createRoute, Link, notFound, useRouter } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { buttonVariants } from "@/components/ui/button"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { GameDataUnavailableError } from "@/data/services/game-data"
import { BuildBar } from "@/features/build-calculator/components/build-bar"
import { CopyBuildLink } from "@/features/build-calculator/components/copy-build-link"
import { ItemDetailsCard } from "@/features/build-calculator/components/item-details-card"
import { ItemDetailsPanel } from "@/features/build-calculator/components/item-details-panel"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { ItemSlotsSkeleton } from "@/features/build-calculator/components/item-slots-skeleton"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { LevelSelectorSkeleton } from "@/features/build-calculator/components/level-selector-skeleton"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { RunesPlaceholder } from "@/features/build-calculator/components/runes-placeholder"
import { ShopViewToggle } from "@/features/build-calculator/components/shop-view-toggle"
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
import { useMediaQuery } from "@/hooks/use-media-query"
import { track } from "@/lib/analytics/analytics"
import { pageWithHeaderRoute } from "./page-with-header-route"

// Tailwind's `lg` breakpoint.
const LG_QUERY = "(min-width: 64rem)"

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
	// The expanded shop is desktop-only: smaller screens keep the regular page.
	const view = useMediaQuery(LG_QUERY) ? build.view : "overview"
	const isShopView = view === "shop"
	const buildHref = router.buildLocation({
		to: championRoute.fullPath,
		params: { key },
		search: build.shareSearch,
	}).href

	return (
		build.champion && (
			<WorkbenchLayout
				view={view}
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
				shop={
					<ItemShop
						patch={patch}
						layout={isShopView ? "expanded" : "compact"}
						actions={
							<ShopViewToggle
								className="max-lg:hidden"
								view={view}
								onViewChange={build.setView}
							/>
						}
						selectedItemId={build.selectedItem?.id}
						onItemSelect={build.selectItem}
						onItemAdd={build.addItem}
					/>
				}
				side={
					isShopView ? (
						<ItemDetailsPanel
							item={build.selectedItem}
							stats={build.stats}
							next={build.preview?.stats}
							isBuildFull={build.isFull}
							onAdd={build.addItem}
							onClose={build.clearSelection}
						/>
					) : (
						<>
							{build.selectedItem && (
								<ItemDetailsCard
									item={build.selectedItem}
									isBuildFull={build.isFull}
									onAdd={build.addItem}
									onClose={build.clearSelection}
								/>
							)}
							<WorkbenchPanel>
								{build.stats && (
									<StatsPanel stats={build.stats} preview={build.preview} />
								)}
							</WorkbenchPanel>
						</>
					)
				}
				bar={
					build.stats && (
						<BuildBar
							champion={build.champion}
							level={build.level}
							onLevelChange={build.setLevel}
							items={build.items}
							onRemoveItem={build.removeItem}
							notice={build.notice}
							stats={build.stats}
						>
							<ShopViewToggle view={view} onViewChange={build.setView} />
						</BuildBar>
					)
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
