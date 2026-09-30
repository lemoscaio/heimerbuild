import type { Champion } from "@schemas/champion"
import { ItemDetailsCard } from "@/features/build-calculator/components/item-details-card"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { MobileChampionRow } from "@/features/build-calculator/components/mobile-champion-row"
import { MobileLayout } from "@/features/build-calculator/components/mobile-layout"
import { RunesStatsNote } from "@/features/build-calculator/components/runes-stats-note"
import { StatChangeList } from "@/features/build-calculator/components/stat-change-list"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import type { BuildPage } from "@/features/build-calculator/hooks/use-build-page"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { RunePage } from "@/features/runes/components/rune-page"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"

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
