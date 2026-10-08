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
import { SkillsTab } from "@/features/skills/components/skills-tab"
import { SummonerSlots } from "@/features/summoners/components/summoner-slots"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { BuildEffectsList } from "./build-effects-list"
import { ChampionSkills } from "./champion-skills"
import { ChampionSwitchNotice } from "./champion-switch-notice"
import { ChampionSwitcher } from "./champion-switcher"
import { ComboTab } from "./combo-tab"
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
	const { championState, items } = build
	// Runes and Skills live in the URL (the overview's tabs); Stats and Shop both mean Items there.
	const [itemsTab, setItemsTab] = useState<"stats" | "shop">("stats")

	function changeTab(nextTab: MobileTab) {
		if (nextTab === "stats" || nextTab === "shop") {
			setItemsTab(nextTab)
			build.setTab("items")
		} else {
			build.setTab(nextTab)
		}
	}

	return (
		<MobileLayout
			top={
				<>
					<MobileChampionRow
						champion={champion}
						avatar={
							<ChampionSwitcher
								build={build}
								champion={champion}
								patch={patch}
								layout="sheet"
							/>
						}
						beside={
							<SummonerSlots
								summoners={build.summoners}
								spellEffects={build.spellEffects}
								layout="sheet"
							/>
						}
					>
						<LevelSelector
							level={championState.level}
							onLevelChange={championState.setLevel}
						/>
					</MobileChampionRow>
					{champion.forms && championState.form && (
						<FormToggle
							forms={champion.forms}
							form={championState.form.id}
							onFormChange={build.formSwitch.setForm}
							locks={build.formSwitch.locks}
							announcement={build.formSwitch.announcement}
						/>
					)}
					{patchNotice}
					<ChampionSwitchNotice
						summary={build.championSwitch.notice}
						championName={champion.name}
						level={championState.level}
						onUndo={build.championSwitch.undo}
						onDismiss={build.championSwitch.dismiss}
					/>
					<ChampionSkills
						abilities={build.abilities ?? champion.abilities}
						skills={build.skills}
						rankUpStats={build.rankUpStats}
					/>
					<ItemSlots
						items={items.list}
						onRemoveItem={items.remove}
						notice={items.notice}
						announcement={items.announcement}
					/>
				</>
			}
			tab={build.tab === "items" ? itemsTab : build.tab}
			onTabChange={changeTab}
			stats={
				build.stats && (
					<StatsPanel
						stats={build.stats}
						resource={champion.resource}
						preview={build.preview}
						formComparison={build.formSwitch.comparison}
					>
						<BuildEffectsList
							conditions={build.conditions}
							championState={build.championState}
							matchState={build.matchState}
						/>
					</StatsPanel>
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
					selection={build.runePage.selection}
					onSelectionChange={build.runePage.setSelection}
					summonerHints={build.summonerHints}
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
			skills={
				<SkillsTab
					abilities={build.abilities ?? champion.abilities}
					skills={build.skills}
					layout="list"
					damage={build.abilityDamage}
				/>
			}
			combo={
				<ComboTab
					combat={build.combat}
					champion={champion}
					summoners={build.summoners.slots}
				/>
			}
			bottom={
				<>
					{build.selectedItem && (
						<ItemDetailsCard
							item={build.selectedItem}
							isBuildFull={items.isFull}
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
