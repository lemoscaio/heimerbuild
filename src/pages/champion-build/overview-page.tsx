import type { Champion } from "@schemas/champion"
import { ComboViewIconToggle } from "@/features/build-calculator/components/combo-view-icon-toggle"
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
import { SkillsTab } from "@/features/skills/components/skills-tab"
import { SummonerSlots } from "@/features/summoners/components/summoner-slots"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { attackTypeAtLevel } from "@/lib/stats/level-states"
import { BuildEffectsList } from "./build-effects-list"
import { ChampionSkills } from "./champion-skills"
import { ChampionSwitchNotice } from "./champion-switch-notice"
import { ChampionSwitcher } from "./champion-switcher"
import { ComboTab } from "./combo-tab"
import type { BuildPage } from "./hooks/use-build-page"

type OverviewPageProps = {
	build: BuildPage
	champion: Champion
	patch: string
	copyLink: React.ReactNode
	patchNotice: React.ReactNode
	/** Gets the focus back after collapsing the combo (`useComboToggleFocus`). */
	comboToggleRef: React.Ref<HTMLButtonElement>
}

/** From `lg` up: champion and build on the left, Items | Runes in the center, stats on the right. */
export function OverviewPage({
	build,
	champion,
	patch,
	copyLink,
	patchNotice,
	comboToggleRef,
}: OverviewPageProps) {
	const { championState, items } = build
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
							attackType={attackTypeAtLevel(champion, championState.level, {
								form: championState.form?.id,
							})}
							avatar={
								<ChampionSwitcher
									build={build}
									champion={champion}
									patch={patch}
									layout="popover"
								/>
							}
							beside={
								<SummonerSlots
									summoners={build.summoners}
									spellEffects={build.spellEffects}
									layout="popover"
									className="-ml-2"
								/>
							}
						/>
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
						<LevelSelector
							level={championState.level}
							onLevelChange={championState.setLevel}
						/>
						<ChampionSkills
							abilities={build.abilities ?? champion.abilities}
							skills={build.skills}
							rankUpStats={build.rankUpStats}
						/>
					</WorkbenchPanel>
					<ChampionSwitchNotice
						summary={build.championSwitch.notice}
						championName={champion.name}
						level={championState.level}
						onUndo={build.championSwitch.undo}
						onDismiss={build.championSwitch.dismiss}
					/>
					<WorkbenchPanel>
						<ItemSlots
							items={items.list}
							onRemoveItem={items.remove}
							notice={items.notice}
							announcement={items.announcement}
						/>
					</WorkbenchPanel>
					<RuneSummary
						patch={patch}
						selection={build.runePage.selection}
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
							selection={build.runePage.selection}
							onSelectionChange={build.runePage.setSelection}
							summonerHints={build.summonerHints}
						/>
					}
					skills={
						<SkillsTab
							abilities={build.abilities ?? champion.abilities}
							skills={build.skills}
							layout="grid"
							damage={build.abilityDamage}
						/>
					}
					combo={
						<ComboTab
							combat={build.combat}
							champion={champion}
							summoners={build.summoners.slots}
							actions={
								<ComboViewIconToggle
									ref={comboToggleRef}
									view={build.view}
									onViewChange={build.setView}
								/>
							}
						/>
					}
				/>
			}
			side={
				<>
					{build.selectedItem && (
						<ItemDetailsCard
							item={build.selectedItem}
							isBuildFull={items.isFull}
							onAdd={build.addItem}
							onClose={build.clearSelection}
						/>
					)}
					<WorkbenchPanel>
						{build.statsPanel && (
							<StatsPanel
								{...build.statsPanel}
								resource={champion.resource}
								formComparison={build.formSwitch.comparison}
							>
								{isRunesTab && <RunesStatsNote />}
								<BuildEffectsList
									conditions={build.conditions}
									championState={build.championState}
									matchState={build.matchState}
								/>
							</StatsPanel>
						)}
					</WorkbenchPanel>
				</>
			}
		/>
	)
}
