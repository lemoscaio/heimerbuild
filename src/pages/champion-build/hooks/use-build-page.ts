import type { AbilitySlot } from "@schemas/champion"
import { useState } from "react"
import { useItems } from "@/data/hooks/use-items"
import type {
	BuildTab,
	BuildView,
} from "@/features/build-calculator/lib/build-search"
import { track } from "@/lib/analytics/analytics"
import { useChampionBuild } from "./use-champion-build"
import { useFormSwitch } from "./use-form-switch"
import { useUrlBuildSource } from "./use-url-build-source"

type UseBuildPageOptions = Parameters<typeof useUrlBuildSource>[0] & {
	patch: string
}

export type BuildPage = ReturnType<typeof useBuildPage>

/**
 * The build page: `useChampionBuild` on the URL build source, plus the page's own state: the view
 * and the open tab (kept in the URL), the shop item picked for a closer look with its preview, the
 * form switch and the rank-up preview. `addItem` also closes the item's details.
 */
export function useBuildPage({
	patch,
	championKey,
	search,
	onSearchChange,
}: UseBuildPageOptions) {
	const source = useUrlBuildSource({ championKey, search, onSearchChange })
	const build = useChampionBuild({ patch, championKey, source })
	const formSwitch = useFormSwitch(build)
	const { data: itemsById } = useItems(patch)
	const [selectedItemId, setSelectedItemId] = useState<string>()

	const { champion, championState, skills, items, runePage, stats } = build
	const { view, tab } = source
	const selectedItem = selectedItemId ? itemsById?.[selectedItemId] : undefined
	const selectedItemStats =
		selectedItem && build.whatIf({ items: [...items.items, selectedItem] })
	const preview =
		selectedItem && selectedItemStats
			? { label: selectedItem.name, stats: selectedItemStats }
			: undefined
	const runesPreview =
		runePage.shards.length && stats
			? { label: "stat shards", stats }
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
		level: championState.level,
		setLevel: championState.setLevel,
		/** The selected form, the default one unless the build names another; undefined without forms. */
		form: championState.form,
		/** Switches the form and announces how many stats changed. */
		setForm: formSwitch.setForm,
		/** The selected form's stats against the other form's: the delta chips. */
		formComparison: formSwitch.comparison,
		formAnnouncement: formSwitch.announcement,
		skills,
		rankUpStats,
		items: items.items,
		addItem,
		removeItem: items.remove,
		/** Why the last item could not be added (full build), until the next change. */
		notice: items.notice,
		/** The last item added, for screen readers, until an item is removed. */
		announcement: items.announcement,
		isFull: items.isFull,
		/** The build's rune page, checked against this patch's runes. */
		runeSelection: runePage.selection,
		setRunes: runePage.setSelection,
		/** Totals with the items, stat shards and ranks. */
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
