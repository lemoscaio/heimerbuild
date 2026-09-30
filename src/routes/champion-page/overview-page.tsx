import type { Champion } from "@schemas/champion"
import { useState } from "react"
import { ItemDetailsCard } from "@/features/build-calculator/components/item-details-card"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { RunesStatsNote } from "@/features/build-calculator/components/runes-stats-note"
import { ShopViewIconToggle } from "@/features/build-calculator/components/shop-view-icon-toggle"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { WorkbenchPanel } from "@/features/build-calculator/components/workbench-panel"
import {
	type WorkbenchTab,
	WorkbenchTabs,
} from "@/features/build-calculator/components/workbench-tabs"
import type { BuildPage } from "@/features/build-calculator/hooks/use-build-page"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { RunePage } from "@/features/runes/components/rune-page"
import { RuneSummary } from "@/features/runes/components/rune-summary"
import { useRuneImagePreload } from "@/features/runes/hooks/use-rune-image-preload"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"

type OverviewPageProps = {
	build: BuildPage
	champion: Champion
	patch: string
	copyLink: React.ReactNode
	patchNotice: React.ReactNode
}

/** From `lg` up: champion and build on the left, Items | Runes in the center, stats on the right. */
export function OverviewPage({
	build,
	champion,
	patch,
	copyLink,
	patchNotice,
}: OverviewPageProps) {
	const [tab, setTab] = useState<WorkbenchTab>("items")
	const isRunesTab = tab === "runes"
	const preloadRuneImages = useRuneImagePreload(patch)
	useAnalyticsContext({ shop_mode: "overview" })

	return (
		<WorkbenchLayout
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
					onRunesIntent={preloadRuneImages}
					items={
						<ItemShop
							patch={patch}
							actions={
								<ShopViewIconToggle
									view={build.view}
									onViewChange={build.setView}
								/>
							}
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
						/>
					}
				/>
			}
			side={
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
			}
		/>
	)
}
