import type { Item } from "@schemas/item"
import type { BuildEffect } from "@/lib/effects/effect"
import {
	type BuildEffectsInput,
	type BuildStatsInput,
	computeBuildStats,
} from "@/lib/stats/compute-build-stats"
import type { ComputedStats, StatName } from "@/lib/stats/compute-stats"

export type StatPartKind =
	| "base"
	| "level"
	| "form"
	| "item"
	| "shards"
	| "ranks"
	| "effect"

/** One source's share of a stat's total. Attack speed parts are attacks per second, like the total. */
export type StatPart = {
	kind: StatPartKind
	label: string
	value: number
	/** The shop item being previewed, not yet in the build. */
	preview?: true
}

export type StatComposition = Record<StatName, StatPart[]>

export type CompositionInput = Omit<BuildStatsInput, "items" | "effects"> & {
	items: readonly Pick<Item, "name" | "stats">[]
	effects: BuildEffectsInput & { available: readonly BuildEffect[] }
}

type CompositionOptions = {
	/** Items from this index on are previewed, not bought. */
	previewFrom?: number
}

type Stage = Omit<StatPart, "value"> & { input: BuildStatsInput }

// Below display precision: floats left over by the subtraction.
const EPSILON = 1e-9

function effectLabel({ name, effect }: BuildEffect) {
	return effect.label ? `${name} · ${effect.label}` : name
}

/**
 * The input built up one source at a time, in the engine's order: the champion at its level, its
 * form, each item, the stat shards, the ability ranks, then each effect the build can turn on.
 */
/** The champion alone at its level, in its default form: no items, shards, ranks or effects. */
function bareInput(input: CompositionInput): BuildStatsInput {
	return {
		...input,
		form: undefined,
		items: [],
		shards: [],
		ranks: undefined,
		effects: undefined,
	}
}

function stages(
	input: CompositionInput,
	{ previewFrom = input.items.length }: CompositionOptions,
): Stage[] {
	const { champion, form, items, shards, ranks, effects } = input
	const bare = bareInput(input)
	const formName = champion.forms?.find(({ id }) => id === form)?.name
	const withItems = { ...bare, form, items }
	const withRanks = { ...withItems, shards, ranks }
	return [
		...(formName
			? [{ kind: "form" as const, label: formName, input: { ...bare, form } }]
			: []),
		...items.map((item, index) => ({
			kind: "item" as const,
			label: item.name,
			...(index >= previewFrom && { preview: true as const }),
			input: { ...bare, form, items: items.slice(0, index + 1) },
		})),
		{ kind: "shards", label: "Stat shards", input: { ...withItems, shards } },
		{ kind: "ranks", label: "Ability ranks", input: withRanks },
		...effects.available.map((effect, index) => ({
			kind: "effect" as const,
			label: effectLabel(effect),
			input: {
				...withRanks,
				effects: {
					...effects,
					available: effects.available.slice(0, index + 1),
				},
			},
		})),
	]
}

/**
 * Each stat's total split by source, by subtraction: every source's part is what the totals gain
 * when it joins the sources before it. The parts always add up to the total, but where sources
 * interact (attack speed multipliers, percent-of-total bonuses, Adaptive Force, the movement speed
 * soft caps) the later source gets the interaction. Prototype only (issue 428).
 */
export function statComposition(
	input: CompositionInput,
	options: CompositionOptions = {},
): StatComposition {
	const first = computeBuildStats(bareInput(input))
	const composition = {} as StatComposition
	for (const stat of Object.keys(first) as StatName[]) {
		const { base, bonus } = first[stat]
		composition[stat] = [
			{ kind: "base", label: `Base at level ${input.level}`, value: base },
			...(Math.abs(bonus) > EPSILON
				? [{ kind: "level" as const, label: "Level growth", value: bonus }]
				: []),
		]
	}
	let previous: ComputedStats = first
	for (const { input: stageInput, ...part } of stages(input, options)) {
		const totals = computeBuildStats(stageInput)
		for (const stat of Object.keys(totals) as StatName[]) {
			const value = totals[stat].total - previous[stat].total
			if (Math.abs(value) > EPSILON) composition[stat].push({ ...part, value })
		}
		previous = totals
	}
	return composition
}
