import type { Champion } from "@schemas/champion"
import { useState } from "react"
import { FormToggle } from "@/features/build-calculator/components/form-toggle"
import { ItemDetailsCard } from "@/features/build-calculator/components/item-details-card"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { MobileChampionRow } from "@/features/build-calculator/components/mobile-champion-row"
import {
	MobileLayout,
	type MobileTab,
} from "@/features/build-calculator/components/mobile-layout"
import { RunesStatsNote } from "@/features/build-calculator/components/runes-stats-note"
import { StatChangeList } from "@/features/build-calculator/components/stat-change-list"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { RunePage } from "@/features/runes/components/rune-page"
import { useRuneImagePreload } from "@/features/runes/hooks/use-rune-image-preload"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import type { BuildPage } from "./hooks/use-build-page"

type MobileBuildPageProps = {
	build: BuildPage
	champion: Champion
	patch: string
	copyLink: React.ReactNode
	patchNotice: React.ReactNode
}

/** Below `lg`: the build on top, Stats | Shop | Runes tabs, and the page actions pinned below. */
export function MobileBuildPage({
	build,
	champion,
	patch,
	copyLink,
	patchNotice,
}: MobileBuildPageProps) {
	useAnalyticsContext("shop_mode", "mobile")
	const preloadRuneImages = useRuneImagePreload(patch)
	// Only Runes lives in the URL (the overview's tab); Stats and Shop both mean Items there.
	const [itemsTab, setItemsTab] = useState<Exclude<MobileTab, "runes">>("stats")

	function changeTab(nextTab: MobileTab) {
		if (nextTab !== "runes") setItemsTab(nextTab)
		build.setTab(nextTab === "runes" ? "runes" : "items")
	}

	return (
		<MobileLayout
			top={
				<>
					<MobileChampionRow champion={champion} formName={build.form?.name}>
						<LevelSelector level={build.level} onLevelChange={build.setLevel} />
					</MobileChampionRow>
					{champion.forms && build.form && (
						<FormToggle
							forms={champion.forms}
							form={build.form.id}
							onFormChange={build.setForm}
							announcement={build.formAnnouncement}
						/>
					)}
					{patchNotice}
					<ItemSlots
						items={build.items}
						onRemoveItem={build.removeItem}
						notice={build.notice}
						announcement={build.announcement}
					/>
				</>
			}
			tab={build.tab === "runes" ? "runes" : itemsTab}
			onTabChange={changeTab}
			stats={
				build.stats && (
					<StatsPanel
						stats={build.stats}
						resource={champion.resource}
						preview={build.preview}
						formComparison={build.formComparison}
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
			onRunesIntent={preloadRuneImages}
			runes={
				<RunePage
					patch={patch}
					selection={build.runeSelection}
					onSelectionChange={build.setRunes}
				>
					{build.stats && build.statsWithoutRunes && (
						<section
							aria-label="Stat shard effect"
							className="flex flex-col gap-2 rounded-xl bg-surface-sunken p-3"
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
