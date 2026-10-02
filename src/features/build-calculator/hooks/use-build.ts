import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { useRunes } from "@/data/hooks/use-runes"
import { track } from "@/lib/analytics/analytics"
import {
	EMPTY_RUNE_SELECTION,
	parseRuneSelection,
	type RuneSelection,
	selectedShards,
	serializeRuneSelection,
} from "@/lib/rune-selection"
import { formChanges, selectedForm } from "@/lib/stats/champion-forms"
import {
	type BuildStatsInput,
	computeBuildStats,
} from "@/lib/stats/compute-build-stats"
import type { ItemInput } from "@/lib/stats/compute-stats"
import { MIN_LEVEL } from "@/lib/stats/growth"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import {
	addItemId,
	knownItemIds,
	MAX_ITEMS,
	removeItemAt,
} from "../lib/build-items"
import { type BuildSearch, toBuildSearch } from "../lib/build-search"
import { recordRecentBuild } from "../services/recent-builds"

type UseBuildOptions = {
	patch: string
	championKey: string
	/** The build as read from the URL. */
	search: BuildSearch
	onSearchChange: (
		search: BuildSearch,
		navigation: { replace: boolean },
	) => void
	/** The abilities' ranks from the skill order, for the stats a rank grants. */
	ranks?: AbilityRanks
}

type SetLevelOptions = {
	/** The `skills` value to save with the level; by default the current one. */
	skills?: string
}

export type Build = ReturnType<typeof useBuild>

/**
 * Build state kept in the URL search: champion, form, level, items, runes and the `skills` value,
 * plus their stats. No page state: the view and the item selection live in `useBuildPage`.
 */
export function useBuild({
	patch,
	championKey,
	search,
	onSearchChange,
	ranks,
}: UseBuildOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const [notice, setNotice] = useState<string>()
	const [announcement, setAnnouncement] = useState<string>()

	const level = search.lvl ?? MIN_LEVEL
	// Until the items load, keep the ids from the link so a level change does not drop them.
	const itemIds = itemsById
		? knownItemIds(search.items, itemsById)
		: (search.items ?? [])
	const items = itemsById ? itemIds.map((id) => itemsById[id]) : []
	const { data: runesFile } = useRunes(patch)
	const runeSelection = runesFile
		? parseRuneSelection(search.runes, runesFile)
		: EMPTY_RUNE_SELECTION
	// Until the runes load, keep the link's value so other edits do not drop it.
	const runes = runesFile ? serializeRuneSelection(runeSelection) : search.runes
	const shards = runesFile ? selectedShards(runeSelection, runesFile) : []
	const form = champion && selectedForm(champion.forms, search.form)
	// Until the champion loads, keep the link's form; then only a form other than the default.
	const formId = champion
		? formChanges(champion.forms, search.form)?.id
		: search.form
	const skills = search.skills

	/** The build's totals with `change` applied: every preview is one input changed. */
	function whatIf(change: Partial<BuildStatsInput> = {}) {
		if (!champion) return undefined
		return computeBuildStats({
			champion,
			level,
			form: formId,
			items,
			shards,
			ranks,
			...change,
		})
	}

	const stats = whatIf()
	const statsWithoutRunes = whatIf({ shards: [] })
	const runesPreview =
		shards.length && stats ? { label: "stat shards", stats } : undefined
	const isFull = itemIds.length >= MAX_ITEMS

	// Edits keep the link's own patch: changing it would reload the route mid-edit.
	// Each edit also lists the build in the home page's recent builds (this browser only).
	function saveBuild(
		next: {
			level: number
			itemIds: readonly string[]
			runes: string | undefined
			form: string | undefined
			skills: string | undefined
		},
		navigation: { replace: boolean },
	) {
		onSearchChange(toBuildSearch({ ...next, patch: search.patch }), navigation)
		recordRecentBuild({
			championKey,
			level: next.level,
			itemIds: [...next.itemIds],
			patch: search.patch,
			runes: next.runes,
			form: next.form,
			skills: next.skills,
		})
	}

	function setLevel(
		nextLevel: number,
		{ skills: nextSkills = skills }: SetLevelOptions = {},
	) {
		saveBuild(
			{ level: nextLevel, itemIds, runes, form: formId, skills: nextSkills },
			{ replace: true },
		)
	}

	function setItemIds(nextItemIds: readonly string[]) {
		saveBuild(
			{ level, itemIds: nextItemIds, runes, form: formId, skills },
			{ replace: false },
		)
	}

	// Replaces the history entry, like the level: Back leaves the page, not one point.
	function setSkills(nextSkills: string | undefined) {
		saveBuild(
			{ level, itemIds, runes, form: formId, skills: nextSkills },
			{ replace: true },
		)
	}

	// Replaces the history entry, like the level: Back leaves the page, not one switch.
	function setForm(nextFormId: string) {
		if (!champion || nextFormId === form?.id) return
		saveBuild(
			{
				level,
				itemIds,
				runes,
				form: formChanges(champion.forms, nextFormId)?.id,
				skills,
			},
			{ replace: true },
		)
		track("champion_form_changed", { champion: championKey, form: nextFormId })
	}

	/** Returns whether the item went in: a full build keeps it out and shows `notice`. */
	function addItem(itemId: string) {
		if (!itemsById) return false
		const nextItemIds = addItemId(itemIds, itemId)
		if (!nextItemIds) {
			setNotice(`All ${MAX_ITEMS} item slots are full. Remove an item first.`)
			return false
		}
		setNotice(undefined)
		setAnnouncement(
			`Added ${itemsById[itemId]?.name}, ${nextItemIds.length} of ${MAX_ITEMS} item slots filled`,
		)
		setItemIds(nextItemIds)
		track("item_added", { itemId })
		return true
	}

	// Each pick replaces the history entry, like the level: Back leaves the page, not one rune.
	function setRunes(nextSelection: RuneSelection) {
		saveBuild(
			{
				level,
				itemIds,
				runes: serializeRuneSelection(nextSelection),
				form: formId,
				skills,
			},
			{ replace: true },
		)
	}

	function removeItem(slot: number) {
		const itemId = itemIds[slot]
		setNotice(undefined)
		setAnnouncement(undefined)
		setItemIds(removeItemAt(itemIds, slot))
		if (itemId) {
			track("item_removed", { itemId })
		}
	}

	return {
		champion,
		/** The selected form, the default one unless the URL names another; undefined without forms. */
		form,
		setForm,
		level,
		setLevel,
		/** Saves the `skills` URL value; the skills domain reads and checks it. */
		setSkills,
		items,
		addItem,
		removeItem,
		/** Why the last item could not be added (full build), until the next change. */
		notice,
		/** The last item added, for screen readers, until an item is removed. */
		announcement,
		isFull,
		/** The rune page read from the URL, checked against this patch's runes. */
		runeSelection,
		setRunes,
		/** Totals with items and stat shards. */
		stats,
		/** Totals without the stat shards: the base of the runes preview. */
		statsWithoutRunes,
		/** The totals with `item` added to the build: the preview of a shop item. */
		statsWithItem: (item: ItemInput) => whatIf({ items: [...items, item] }),
		/** `stats` as they would be in another form: the base of the form deltas. */
		statsInForm: (otherFormId: string) => whatIf({ form: otherFormId }),
		/** `stats` with other ability ranks: the base of the rank-up preview. */
		statsWithRanks: (otherRanks: AbilityRanks) => whatIf({ ranks: otherRanks }),
		/** `stats` labelled as the shards' effect, while at least one shard is chosen. */
		runesPreview,
		/** The build as the URL reads it: known items, checked runes, the link's own patch. */
		buildSearch: toBuildSearch({
			level,
			itemIds,
			patch: search.patch,
			runes,
			form: formId,
			skills,
		}),
		/** The full build for sharing, pinned to the patch in use. */
		shareSearch: toBuildSearch({
			level,
			itemIds,
			patch,
			runes,
			form: formId,
			skills,
		}),
	}
}
