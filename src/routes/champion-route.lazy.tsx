import type { Champion } from "@schemas/champion"
import { createLazyRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BuildBar } from "@/features/build-calculator/components/build-bar"
import { CopyBuildLink } from "@/features/build-calculator/components/copy-build-link"
import { ItemDetailsCard } from "@/features/build-calculator/components/item-details-card"
import { ItemDetailsPanel } from "@/features/build-calculator/components/item-details-panel"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { MobileChampionRow } from "@/features/build-calculator/components/mobile-champion-row"
import { MobileLayout } from "@/features/build-calculator/components/mobile-layout"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { RunesStatsNote } from "@/features/build-calculator/components/runes-stats-note"
import { ShopViewIconToggle } from "@/features/build-calculator/components/shop-view-icon-toggle"
import { ShopViewToggle } from "@/features/build-calculator/components/shop-view-toggle"
import { StatChangeList } from "@/features/build-calculator/components/stat-change-list"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { WorkbenchPanel } from "@/features/build-calculator/components/workbench-panel"
import {
	type WorkbenchTab,
	WorkbenchTabs,
} from "@/features/build-calculator/components/workbench-tabs"
import {
	type Build,
	useBuild,
} from "@/features/build-calculator/hooks/use-build"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { RunePage } from "@/features/runes/components/rune-page"
import { RuneSummary } from "@/features/runes/components/rune-summary"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { useMediaQuery } from "@/hooks/use-media-query"
import { track } from "@/lib/analytics/analytics"
import { isRuneSelectionEmpty } from "@/lib/rune-selection"

// Tailwind's `lg` breakpoint.
const LG_QUERY = "(min-width: 64rem)"

// Hover waits before the first tooltip, so moving across items does not cover the target;
// once one is open, the next opens instantly (Base UI groups tooltips under the provider).
const TOOLTIP_DELAY_MS = 450

/** The build page, loaded as its own chunk; the id includes the pathless `page-with-header` layout. */
export const championLazyRoute = createLazyRoute(
	"/page-with-header/champions/$key",
)({
	component: ChampionPage,
})

function ChampionPage() {
	const { key } = championLazyRoute.useParams()
	const { patch, unavailablePatch } = championLazyRoute.useLoaderData()
	const search = championLazyRoute.useSearch()
	const navigate = championLazyRoute.useNavigate()
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
		to: "/champions/$key",
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
					hasRunes: !isRuneSelectionEmpty(build.runeSelection),
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
	return (
		<TooltipProvider delay={TOOLTIP_DELAY_MS}>
			{isDesktop ? (
				<DesktopChampionPage {...props} />
			) : (
				<MobileChampionPage {...props} />
			)}
		</TooltipProvider>
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
	const [tab, setTab] = useState<WorkbenchTab>("items")
	const isRunesTab = !isShopView && tab === "runes"
	useAnalyticsContext({ shop_mode: isShopView ? "expanded" : "overview" })

	const itemShop = (
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
	)

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
							announcement={build.announcement}
						/>
					</WorkbenchPanel>
					<RuneSummary
						patch={patch}
						selection={build.runeSelection}
						isEditing={isRunesTab}
						onEdit={() => setTab("runes")}
					/>
				</>
			}
			shop={
				<WorkbenchTabs
					tab={tab}
					onTabChange={setTab}
					items={itemShop}
					runes={
						!isShopView && (
							<RunePage
								patch={patch}
								selection={build.runeSelection}
								onSelectionChange={build.setRunes}
							/>
						)
					}
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
							{build.stats &&
								build.statsWithoutRunes &&
								(isRunesTab ? (
									<StatsPanel
										stats={build.statsWithoutRunes}
										resource={champion.resource}
										preview={build.runesPreview}
									>
										<RunesStatsNote />
									</StatsPanel>
								) : (
									<StatsPanel
										stats={build.stats}
										resource={champion.resource}
										preview={build.preview}
									/>
								))}
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
						announcement={build.announcement}
						stats={build.stats}
					/>
				)
			}
		/>
	)
}

/** Below `lg`: the build on top, Stats | Shop | Runes tabs, and the page actions pinned below. */
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
						announcement={build.announcement}
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
			runes={
				<RunePage
					patch={patch}
					selection={build.runeSelection}
					onSelectionChange={build.setRunes}
				>
					{build.stats && build.statsWithoutRunes && (
						<section
							aria-label="Stat shard effect"
							className="flex flex-col gap-2 rounded-xl bg-primary-4 p-3"
						>
							<h3 className="font-bold font-display text-sm">
								Stats with shards
							</h3>
							<StatChangeList
								stats={build.statsWithoutRunes}
								next={build.stats}
							/>
							<RunesStatsNote />
						</section>
					)}
				</RunePage>
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
