import type { Champion } from "@schemas/champion"
import { FormToggle } from "@/features/build-calculator/components/form-toggle"
import { ItemDetailsCard } from "@/features/build-calculator/components/item-details-card"
import { ItemSlots } from "@/features/build-calculator/components/item-slots"
import { LevelSelector } from "@/features/build-calculator/components/level-selector"
import { RunesStatsNote } from "@/features/build-calculator/components/runes-stats-note"
import { ShopViewIconToggle } from "@/features/build-calculator/components/shop-view-icon-toggle"
import { StatsPanel } from "@/features/build-calculator/components/stats-panel"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { WorkbenchPanel } from "@/features/build-calculator/components/workbench-panel"
import { WorkbenchTabs } from "@/features/build-calculator/components/workbench-tabs"
import { ChampionHeader } from "@/features/champions/components/champion-header"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { RunePage } from "@/features/runes/components/rune-page"
import { RuneSummary } from "@/features/runes/components/rune-summary"
import { useRuneImagePreload } from "@/features/runes/hooks/use-rune-image-preload"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { attackTypeAtLevel } from "@/lib/stats/level-states"
import { ChampionSkills } from "./champion-skills"
import type { BuildPage } from "./hooks/use-build-page"

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
	const isRunesTab = build.tab === "runes"
	const preloadRuneImages = useRuneImagePreload(patch)
	useAnalyticsContext("shop_mode", "overview")

	return (
		<WorkbenchLayout
			actions={copyLink}
			build={
				<>
					<WorkbenchPanel className="flex flex-col gap-3">
						<ChampionHeader
							champion={champion}
							attackType={attackTypeAtLevel(champion, build.level, {
								form: build.form?.id,
							})}
							formName={build.form?.name}
						/>
						{champion.forms && build.form && (
							<FormToggle
								forms={champion.forms}
								form={build.form.id}
								onFormChange={build.setForm}
								announcement={build.formAnnouncement}
							/>
						)}
						{patchNotice}
						<LevelSelector level={build.level} onLevelChange={build.setLevel} />
						<ChampionSkills build={build} champion={champion} />
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
						onEdit={() => build.setTab("runes")}
					/>
				</>
			}
			shop={
				<WorkbenchTabs
					tab={build.tab}
					onTabChange={build.setTab}
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
									formComparison={build.formComparison}
								>
									<RunesStatsNote />
								</StatsPanel>
							) : (
								<StatsPanel
									stats={build.stats}
									resource={champion.resource}
									preview={build.preview}
									formComparison={build.formComparison}
								/>
							))}
					</WorkbenchPanel>
				</>
			}
		/>
	)
}
