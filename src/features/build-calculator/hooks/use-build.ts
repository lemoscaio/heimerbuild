import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import {
	type BuildStatsInput,
	computeBuildStats,
} from "@/lib/stats/compute-build-stats"
import type { ItemInput } from "@/lib/stats/compute-stats"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type {
	BuildNavigation,
	BuildSource,
	BuildValues,
} from "../types/build-source"
import { useBuildItems } from "./use-build-items"

type UseBuildOptions = {
	patch: string
	championKey: string
	/** Where the build's values live and where its edits are saved. */
	source: BuildSource
	/** The abilities' ranks from the skill order, for the stats a rank grants. */
	ranks?: AbilityRanks
	/** The champion state's level and checked `form` value. */
	championState: { level: number; formValue: string | undefined }
	/** The rune page's checked `runes` value and its stat shards. */
	runes: { value: string | undefined; shards: BuildStatsInput["shards"] }
}

/** Browser history per edit: Back undoes an item edit; every other edit replaces the entry. */
const EDIT_HISTORY = {
	championState: { replace: true },
	items: { replace: false },
	runes: { replace: true },
	skills: { replace: true },
} as const satisfies Record<string, BuildNavigation>

export type Build = ReturnType<typeof useBuild>

/**
 * The build read from its source: the items, plus the checked values of the other domains and
 * the stats. No page state: the view and the item selection live in `useBuildPage`.
 */
export function useBuild({
	patch,
	championKey,
	source,
	ranks,
	championState,
	runes: runePage,
}: UseBuildOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const buildItems = useBuildItems({
		itemsById,
		value: source.state.itemIds,
		onChange: (itemIds) => save({ itemIds }, EDIT_HISTORY.items),
	})

	const { level, formValue: formId } = championState
	const { ids: itemIds, items } = buildItems
	const { value: runes, shards } = runePage
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

	/** The checked values every edit saves next to its own change (the link's while data loads). */
	const values: BuildValues = { level, itemIds, runes, form: formId, skills }

	function save(change: Partial<BuildValues>, navigation: BuildNavigation) {
		source.update({ ...values, ...change }, navigation)
	}

	/** Saves a level or form change, with the `skills` value that goes with a new level. */
	function setChampionState(
		change: Partial<Pick<BuildValues, "level" | "form" | "skills">>,
	) {
		save(change, EDIT_HISTORY.championState)
	}

	function setSkills(nextSkills: string | undefined) {
		save({ skills: nextSkills }, EDIT_HISTORY.skills)
	}

	function setRunes(nextRunes: string | undefined) {
		save({ runes: nextRunes }, EDIT_HISTORY.runes)
	}

	return {
		champion,
		setChampionState,
		/** Saves the `skills` value; the skills domain reads and checks it. */
		setSkills,
		items,
		addItem: buildItems.add,
		removeItem: buildItems.remove,
		/** Why the last item could not be added (full build), until the next change. */
		notice: buildItems.notice,
		/** The last item added, for screen readers, until an item is removed. */
		announcement: buildItems.announcement,
		isFull: buildItems.isFull,
		/** Saves the `runes` value; the rune page domain reads and checks it. */
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
