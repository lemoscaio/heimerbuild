import type { Champion } from "@schemas/champion"
import type { Item } from "@schemas/item"
import type { RunesFile } from "@schemas/rune"
import { availableEffects } from "@/lib/effects/available-effects"
import { comparedForm, selectedForm } from "@/lib/stats/champion-forms"
import { computeBuildStats } from "@/lib/stats/compute-build-stats"
import type { ComputedStats } from "@/lib/stats/compute-stats"
import type { MockupBuild } from "./mockup-builds"
import {
	type CompositionInput,
	type StatComposition,
	statComposition,
} from "./stat-composition"

export type MockupGameData = {
	patch: string
	champion: Champion
	itemsById: Readonly<Record<string, Item>>
	runes: RunesFile
}

type MockupStatsOptions = {
	/** The selected form's id; absent means the default form. */
	form?: string
	/** Adds the build's preview item, as hovering it in the shop does. */
	preview?: boolean
}

export type MockupStats = {
	stats: ComputedStats
	composition: StatComposition
	/** The build with the preview item, when previewing. */
	preview?: {
		label: string
		stats: ComputedStats
		composition: StatComposition
	}
	/** The other form's stats, for a champion with forms. */
	compared?: { formName: string; comparedName: string; stats: ComputedStats }
	/** Bonus attack speed shows as a percent of this ratio, as in game. */
	attackSpeedRatio: number
}

function itemsOf(
	ids: readonly string[],
	itemsById: MockupGameData["itemsById"],
) {
	return ids.flatMap((id) => itemsById[id] ?? [])
}

/** One mockup build's real stats: totals, composition by source, the preview and the other form. */
export function mockupStats(
	build: MockupBuild,
	{ patch, champion, itemsById, runes }: MockupGameData,
	{ form, preview = false }: MockupStatsOptions = {},
): MockupStats {
	const items = itemsOf(build.itemIds, itemsById)
	const shards = build.shardIds.flatMap(
		(id) => runes.shards.find((shard) => shard.id === id) ?? [],
	)
	function inputWith(buildItems: readonly Item[]): CompositionInput {
		const available = availableEffects({
			patch,
			champion,
			ranks: build.ranks,
			spells: [],
			runes: [],
			items: buildItems,
		})
		return {
			champion,
			patch,
			level: build.level,
			form,
			items: buildItems,
			shards,
			ranks: build.ranks,
			effects: { available, overrides: build.overrides },
		}
	}
	const input = inputWith(items)
	const previewItem = itemsById[build.previewItemId]
	const previewInput = previewItem && inputWith([...items, previewItem])
	const selected = selectedForm(champion.forms, form, { ranks: build.ranks })
	const other = comparedForm(champion.forms, form, { ranks: build.ranks })

	return {
		stats: computeBuildStats(input),
		composition: statComposition(input),
		...(preview &&
			previewItem &&
			previewInput && {
				preview: {
					label: previewItem.name,
					stats: computeBuildStats(previewInput),
					composition: statComposition(previewInput, {
						previewFrom: items.length,
					}),
				},
			}),
		...(selected &&
			other && {
				compared: {
					formName: selected.name,
					comparedName: other.name,
					stats: computeBuildStats({ ...input, form: other.id }),
				},
			}),
		attackSpeedRatio: champion.stats.attackSpeed.ratio,
	}
}
