import type { AbilitySlot } from "@schemas/champion"
import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { useRunes } from "@/data/hooks/use-runes"
import { useBuild } from "@/features/build-calculator/hooks/use-build"
import type {
	BuildTab,
	BuildView,
} from "@/features/build-calculator/lib/build-search"
import { useRunePage } from "@/features/runes/hooks/use-rune-page"
import { useSkills } from "@/features/skills/hooks/use-skills"
import { track } from "@/lib/analytics/analytics"
import { useFormSwitch } from "./use-form-switch"
import { useUrlBuildSource } from "./use-url-build-source"

type UseBuildPageOptions = Parameters<typeof useUrlBuildSource>[0] & {
	patch: string
}

export type BuildPage = ReturnType<typeof useBuildPage>

/**
 * The build page: `useBuild`, `useSkills` and `useRunePage` on the URL build source, plus the page's own state:
 * the view and the open tab (kept in the URL), the shop item picked for a closer look and the form
 * switch. `addItem` also closes that item's details.
 */
export function useBuildPage({
	patch,
	championKey,
	search,
	onSearchChange,
}: UseBuildPageOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const source = useUrlBuildSource({ championKey, search, onSearchChange })
	// The skills come first: the build's stats read their ranks.
	const skills = useSkills({
		champion,
		level: source.state.level,
		value: source.state.skills,
		onChange: (value) => build.setSkills(value),
	})
	const { data: runesFile } = useRunes(patch)
	const runePage = useRunePage({
		runes: runesFile,
		value: source.state.runes,
		onChange: (value) => build.setRunes(value),
	})
	const build = useBuild({
		patch,
		championKey,
		source,
		ranks: skills.ranks,
		runes: runePage,
	})
	const formSwitch = useFormSwitch(build)
	const { data: itemsById } = useItems(patch)
	const [selectedItemId, setSelectedItemId] = useState<string>()

	const { view, tab } = source
	const selectedItem = selectedItemId ? itemsById?.[selectedItemId] : undefined
	const selectedItemStats = selectedItem && build.statsWithItem(selectedItem)
	const preview =
		selectedItem && selectedItemStats
			? { label: selectedItem.name, stats: selectedItemStats }
			: undefined

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
		if (build.addItem(itemId)) setSelectedItemId(undefined)
	}

	/** The stats now and with one more rank in `slot`, when that ability's rank grants stats. */
	function rankUpStats(slot: AbilitySlot) {
		if (!champion?.rankStats?.some((rankStat) => rankStat.slot === slot)) {
			return undefined
		}
		const nextRanks = skills.ranksWithNext(slot)
		const next = nextRanks && build.statsWithRanks(nextRanks)
		return build.stats && next ? { stats: build.stats, next } : undefined
	}

	// Saves the skill points the new level keeps, or brings back the ones it kept.
	function setLevel(nextLevel: number) {
		build.setLevel(nextLevel, { skills: skills.valueAtLevel(nextLevel) })
	}

	return {
		...build,
		setLevel,
		skills,
		/** The build's rune page, checked against this patch's runes. */
		runeSelection: runePage.selection,
		setRunes: runePage.setSelection,
		rankUpStats,
		addItem,
		/** Switches the form and announces how many stats changed. */
		setForm: formSwitch.setForm,
		/** The selected form's stats against the other form's: the delta chips. */
		formComparison: formSwitch.comparison,
		formAnnouncement: formSwitch.announcement,
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
