import type { AbilitySlot } from "@schemas/champion"
import { useState } from "react"
import { useItems } from "@/data/hooks/use-items"
import { useRunes } from "@/data/hooks/use-runes"
import type {
	BuildTab,
	BuildView,
} from "@/features/build-calculator/lib/build-search"
import { track } from "@/lib/analytics/analytics"
import { selectedRunes } from "@/lib/rune-selection"
import {
	runeSummonerHints,
	spellRuneEffectsById,
} from "@/lib/summoner-rune-interactions"
import { useBuildCombat } from "./use-build-combat"
import { useChampionBuild } from "./use-champion-build"
import { useChampionSwitch } from "./use-champion-switch"
import { useFormSwitch } from "./use-form-switch"
import { useUrlBuildSource } from "./use-url-build-source"

type UseBuildPageOptions = Parameters<typeof useUrlBuildSource>[0] & {
	patch: string
}

export type BuildPage = ReturnType<typeof useBuildPage>

/**
 * The build page: `useChampionBuild` on the URL build source, plus the page's own state: the view
 * and the open tab (kept in the URL), the shop item picked for a closer look with its preview, the
 * form switch, the rank-up preview and the champion switch. `addItem` also closes the item's details.
 */
export function useBuildPage({
	patch,
	championKey,
	search,
	onSearchChange,
	onChampionChange,
}: UseBuildPageOptions) {
	const source = useUrlBuildSource({
		championKey,
		search,
		onSearchChange,
		onChampionChange,
	})
	const build = useChampionBuild({ patch, championKey, source })
	const championSwitch = useChampionSwitch({ values: build.values, source })
	const formSwitch = useFormSwitch(build)
	const combat = useBuildCombat(build)
	const { data: itemsById } = useItems(patch)
	const { data: runes } = useRunes(patch)
	const [selectedItemId, setSelectedItemId] = useState<string>()

	const { champion, championState, skills, items, runePage, summoners, stats } =
		build
	const { view, tab } = source
	const selectedItem = selectedItemId ? itemsById?.[selectedItemId] : undefined
	const selectedItemStats =
		selectedItem && build.whatIf({ items: [...items.list, selectedItem] })
	const preview =
		selectedItem && selectedItemStats
			? { label: selectedItem.name, stats: selectedItemStats }
			: undefined
	const runesPreview =
		runePage.shards.length && stats
			? { label: "stat shards", stats }
			: undefined

	// Runes × summoner spells: the page wires the two domains, neither knows the other.
	const pageRunes = runes ? selectedRunes(runePage.selection, runes) : []
	const chosenSpells = summoners.slots.filter((spell) => spell !== undefined)

	// Leaving for the expanded shop drops the tab: the overview comes back on Items.
	function setView(nextView: BuildView) {
		source.updatePage(build.values, { view: nextView }, { replace: false })
	}

	// Replaces the history entry, like a level change: Back leaves the page, not a tab.
	function setTab(nextTab: BuildTab) {
		if (nextTab === tab) return
		source.updatePage(build.values, { view, tab: nextTab }, { replace: true })
	}

	function selectItem(itemId: string) {
		if (itemId === selectedItemId) return
		setSelectedItemId(itemId)
		track("shop_item_selected", { itemId })
	}

	function addItem(itemId: string) {
		if (items.add(itemId)) setSelectedItemId(undefined)
	}

	/** The stats now and with one more rank in `slot`, when that ability's rank grants stats. */
	function rankUpStats(slot: AbilitySlot) {
		if (!champion?.rankStats?.some((rankStat) => rankStat.slot === slot)) {
			return undefined
		}
		const nextRanks = skills.ranksWithNext(slot)
		const next = nextRanks && build.whatIf({ ranks: nextRanks })
		return stats && next ? { stats, next } : undefined
	}

	return {
		champion,
		/** Level, form and current health; `formSwitch.setForm` switches the form with its announcement. */
		championState,
		/** Switches the form and announces how many stats changed, with the delta chips. */
		formSwitch,
		/** Switches to another champion keeping what fits it, and the notice of the last switch. */
		championSwitch,
		skills,
		/** The abilities in the selected form, which the skills row and tab show. */
		abilities: build.abilities,
		rankUpStats,
		/** The chosen items; `addItem` adds one from the shop and closes its details. */
		items,
		addItem,
		runePage,
		/** The two summoner spell slots; `pick`, `swap` and `clear` edit them. */
		summoners,
		/** The match's game time. */
		matchState: build.matchState,
		/** The build's conditional effects with their switches; `setOn` turns one on or off. */
		conditions: build.conditions,
		/** The combo: its target and steps, kept in the link, simulated on the build. */
		combat,
		/** The page's runes that react to the chosen summoner spells, with what happens. */
		summonerHints: runeSummonerHints(pageRunes, chosenSpells),
		/** For each spell a slot can take, the page's runes that react to it (the picker). */
		spellEffects: spellRuneEffectsById(pageRunes, summoners.available),
		/** Totals with the items, stat shards, ranks and the effects turned on. */
		stats,
		/** Totals without the stat shards: the base of the runes preview. */
		statsWithoutRunes: build.statsWithoutRunes,
		/** `stats` labelled as the shards' effect, while at least one shard is chosen. */
		runesPreview,
		/** The overview workbench or the expanded shop, kept in the URL. */
		view,
		setView,
		/** The open center tab, Items, Runes or Skills, kept in the URL. */
		tab,
		setTab,
		/** The shop item picked for a closer look, not in the build yet. */
		selectedItem,
		selectItem,
		clearSelection: () => setSelectedItemId(undefined),
		/** The stats with the selected item added, while one is selected. */
		preview,
		/** The full build for sharing, pinned to the patch in use, in the current view and tab. */
		shareSearch: source.shareSearch(
			{ ...build.values, skills: skills.value },
			patch,
		),
	}
}
