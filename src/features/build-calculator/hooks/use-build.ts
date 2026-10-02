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
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import {
	addItemId,
	knownItemIds,
	MAX_ITEMS,
	removeItemAt,
} from "../lib/build-items"
import type {
	BuildNavigation,
	BuildSource,
	BuildValues,
} from "../types/build-source"

type UseBuildOptions = {
	patch: string
	championKey: string
	/** Where the build's values live and where its edits are saved. */
	source: BuildSource
	/** The abilities' ranks from the skill order, for the stats a rank grants. */
	ranks?: AbilityRanks
}

type SetLevelOptions = {
	/** The `skills` value to save with the level; by default the current one. */
	skills?: string
}

/** Browser history per edit: Back undoes an item edit; every other edit replaces the entry. */
const EDIT_HISTORY = {
	level: { replace: true },
	form: { replace: true },
	items: { replace: false },
	runes: { replace: true },
	skills: { replace: true },
} as const satisfies Record<string, BuildNavigation>

export type Build = ReturnType<typeof useBuild>

/**
 * The build read from its source: champion, form, level, items, runes and the `skills` value,
 * plus their stats. No page state: the view and the item selection live in `useBuildPage`.
 */
export function useBuild({
	patch,
	championKey,
	source,
	ranks,
}: UseBuildOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const [notice, setNotice] = useState<string>()
	const [announcement, setAnnouncement] = useState<string>()

	const level = source.state.level
	// Until the items load, keep the ids from the link so a level change does not drop them.
	const itemIds = itemsById
		? knownItemIds(source.state.itemIds, itemsById)
		: source.state.itemIds
	const items = itemsById ? itemIds.map((id) => itemsById[id]) : []
	const { data: runesFile } = useRunes(patch)
	const runeSelection = runesFile
		? parseRuneSelection(source.state.runes, runesFile)
		: EMPTY_RUNE_SELECTION
	// Until the runes load, keep the link's value so other edits do not drop it.
	const runes = runesFile
		? serializeRuneSelection(runeSelection)
		: source.state.runes
	const shards = runesFile ? selectedShards(runeSelection, runesFile) : []
	const form = champion && selectedForm(champion.forms, source.state.form)
	// Until the champion loads, keep the link's form; then only a form other than the default.
	const formId = champion
		? formChanges(champion.forms, source.state.form)?.id
		: source.state.form
	const skills = source.state.skills

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

	/** The checked values every edit saves next to its own change (the link's while data loads). */
	const values: BuildValues = { level, itemIds, runes, form: formId, skills }

	function save(change: Partial<BuildValues>, navigation: BuildNavigation) {
		source.update({ ...values, ...change }, navigation)
	}

	function setLevel(
		nextLevel: number,
		{ skills: nextSkills = skills }: SetLevelOptions = {},
	) {
		save({ level: nextLevel, skills: nextSkills }, EDIT_HISTORY.level)
	}

	function setItemIds(nextItemIds: readonly string[]) {
		save({ itemIds: nextItemIds }, EDIT_HISTORY.items)
	}

	function setSkills(nextSkills: string | undefined) {
		save({ skills: nextSkills }, EDIT_HISTORY.skills)
	}

	function setForm(nextFormId: string) {
		if (!champion || nextFormId === form?.id) return
		save(
			{ form: formChanges(champion.forms, nextFormId)?.id },
			EDIT_HISTORY.form,
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

	function setRunes(nextSelection: RuneSelection) {
		save({ runes: serializeRuneSelection(nextSelection) }, EDIT_HISTORY.runes)
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
		/** The selected form, the default one unless the build names another; undefined without forms. */
		form,
		setForm,
		level,
		setLevel,
		/** Saves the `skills` value; the skills domain reads and checks it. */
		setSkills,
		items,
		addItem,
		removeItem,
		/** Why the last item could not be added (full build), until the next change. */
		notice,
		/** The last item added, for screen readers, until an item is removed. */
		announcement,
		isFull,
		/** The build's rune page, checked against this patch's runes. */
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
		/** The checked values: known items, checked runes, the default form left out. */
		values,
	}
}
