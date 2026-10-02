import type { AbilitySlot } from "@schemas/champion"
import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { useBuild } from "@/features/build-calculator/hooks/use-build"
import type {
	BuildSearch,
	BuildTab,
	BuildView,
} from "@/features/build-calculator/lib/build-search"
import { useSkills } from "@/features/skills/hooks/use-skills"
import { track } from "@/lib/analytics/analytics"
import { MIN_LEVEL } from "@/lib/stats/growth"
import { useFormSwitch } from "./use-form-switch"

type UseBuildPageOptions = Parameters<typeof useBuild>[0]

export type BuildPage = ReturnType<typeof useBuildPage>

/**
 * The build page: `useBuild` and `useSkills` plus the page's own state, the view and the open tab
 * (kept in the URL), the shop item picked for a closer look and the form switch. `addItem` also
 * closes that item's details.
 */
export function useBuildPage({
	patch,
	championKey,
	search,
	onSearchChange,
}: UseBuildPageOptions) {
	const { data: champion } = useChampion(patch, championKey)
	// The skills come first: the build's stats read their ranks.
	const skills = useSkills({
		champion,
		level: search.lvl ?? MIN_LEVEL,
		value: search.skills,
		onChange: (value) => build.setSkills(value),
	})
	// Build edits keep the view and the tab the page is in.
	const build = useBuild({
		patch,
		championKey,
		search,
		onSearchChange: (nextSearch, navigation) =>
			onSearchChange(
				{ ...nextSearch, view: search.view, tab: search.tab },
				navigation,
			),
		ranks: skills.ranks,
	})
	const formSwitch = useFormSwitch(build)
	const { data: itemsById } = useItems(patch)
	const [selectedItemId, setSelectedItemId] = useState<string>()

	const view: BuildView = search.view ?? "overview"
	const tab: BuildTab = search.tab ?? "items"
	const selectedItem = selectedItemId ? itemsById?.[selectedItemId] : undefined
	const selectedItemStats = selectedItem && build.statsWithItem(selectedItem)
	const preview =
		selectedItem && selectedItemStats
			? { label: selectedItem.name, stats: selectedItemStats }
			: undefined

	// Leaving for the expanded shop drops the tab: the overview comes back on Items.
	function setView(nextView: BuildView) {
		onSearchChange(
			{ ...build.buildSearch, view: viewParam(nextView) },
			{ replace: false },
		)
	}

	// Replaces the history entry, like a level change: Back leaves the page, not a tab.
	function setTab(nextTab: BuildTab) {
		if (nextTab === tab) return
		onSearchChange(
			{ ...build.buildSearch, view: search.view, tab: tabParam(nextTab) },
			{ replace: true },
		)
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
		shareSearch: {
			...build.shareSearch,
			skills: skills.value,
			view: search.view,
			tab: search.tab,
		},
	}
}

function viewParam(view: BuildView): BuildSearch["view"] {
	return view === "shop" ? view : undefined
}

function tabParam(tab: BuildTab): BuildSearch["tab"] {
	return tab === "items" ? undefined : tab
}
