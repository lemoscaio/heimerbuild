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
import { MobileChampionRow } from "@/features/build-calculator/components/mobile-champion-row"
import { MobileLayout } from "@/features/build-calculator/components/mobile-layout"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { RunesPlaceholder } from "@/features/build-calculator/components/runes-placeholder"
import { ShopViewIconToggle } from "@/features/build-calculator/components/shop-view-icon-toggle"
import { ShopViewToggle } from "@/features/build-calculator/components/shop-view-toggle"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { StatsPanelSkeleton } from "@/features/build-calculator/components/stats-panel-skeleton"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { WorkbenchPanel } from "@/features/build-calculator/components/workbench-panel"
import {
	type Build,
	useBuild,
} from "@/features/build-calculator/hooks/use-build"
import { resolveBuildPatch } from "@/features/build-calculator/lib/build-patch"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ChampionHeaderSkeleton } from "@/features/champions/components/champion-header-skeleton"
import { ItemGridSkeleton } from "@/features/item-shop/components/item-grid-skeleton"
import { ItemList } from "@/features/item-shop/components/item-list"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { useMediaQuery } from "@/hooks/use-media-query"
import { track } from "@/lib/analytics/analytics"
import type { Champion } from "../../scripts/sync-data/schemas/champion"
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
	const isDesktop = useMediaQuery(LG_QUERY)
	const buildHref = router.buildLocation({
		to: championRoute.fullPath,
		params: { key },
		search: build.shareSearch,
	}).href

	// Desktop: in the action bar above the workbench. Mobile: in the bottom bar.
	const copyLink = (
		<CopyBuildLink
			layout={isDesktop ? "inline" : "stacked"}
			href={buildHref}
			onCopied={() =>
				track("build_link_copied", {
					champion: key,
					level: build.level,
					itemsCount: build.items.length,
				})
			}
		/>
	)
	const patchNotice = unavailablePatch && (
		<PatchNotice requestedPatch={unavailablePatch} patch={patch} />
	)

	if (!build.champion) return null
	const props = {
		build,
		champion: build.champion,
		patch,
		copyLink,
		patchNotice,
	}
	return isDesktop ? (
		<DesktopChampionPage {...props} />
	) : (
		<MobileChampionPage {...props} />
	)
}

type ChampionPageProps = {
	build: Build
	champion: Champion
	patch: string
	copyLink: React.ReactNode
	patchNotice: React.ReactNode
}

function DesktopChampionPage({
	build,
	champion,
	patch,
	copyLink,
	patchNotice,
}: ChampionPageProps) {
	const view = build.view
	const isShopView = view === "shop"
	useAnalyticsContext({ shop_mode: isShopView ? "expanded" : "overview" })

	return (
		<WorkbenchLayout
			view={view}
			actions={copyLink}
			build={
				<>
					<WorkbenchPanel className="flex flex-col gap-3">
						<ChampionHeader champion={champion} />
						{patchNotice}
						<LevelSelector level={build.level} onLevelChange={build.setLevel} />
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
						isShopView ? (
							<ShopViewToggle view={view} onViewChange={build.setView} />
						) : (
							<ShopViewIconToggle view={view} onViewChange={build.setView} />
						)
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
								<StatsPanel
									stats={build.stats}
									resource={champion.resource}
									preview={build.preview}
								/>
							)}
						</WorkbenchPanel>
					</>
				)
			}
			bar={
				build.stats && (
					<BuildBar
						champion={champion}
						level={build.level}
						onLevelChange={build.setLevel}
						items={build.items}
						onRemoveItem={build.removeItem}
						notice={build.notice}
						stats={build.stats}
					/>
				)
			}
		/>
	)
}

/** Below `lg`: the build on top, Stats | Shop tabs, and the page actions pinned below. */
function MobileChampionPage({
	build,
	champion,
	patch,
	copyLink,
	patchNotice,
}: ChampionPageProps) {
	useAnalyticsContext({ shop_mode: "mobile" })

	return (
		<MobileLayout
			top={
				<>
					<MobileChampionRow champion={champion}>
						<LevelSelector level={build.level} onLevelChange={build.setLevel} />
					</MobileChampionRow>
					{patchNotice}
					<ItemSlots
						items={build.items}
						onRemoveItem={build.removeItem}
						notice={build.notice}
					/>
				</>
			}
			stats={
				build.stats && (
					<StatsPanel
						stats={build.stats}
						resource={champion.resource}
						preview={build.preview}
					/>
				)
			}
			shop={
				<ItemShop
					patch={patch}
					selectedItemId={build.selectedItem?.id}
					onItemSelect={build.selectItem}
					onItemAdd={build.addItem}
				/>
			}
			bottom={
				<>
					{build.selectedItem && (
						<ItemDetailsCard
							item={build.selectedItem}
							isBuildFull={build.isFull}
							onAdd={build.addItem}
							onClose={build.clearSelection}
						/>
					)}
					{copyLink}
				</>
			}
		/>
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
