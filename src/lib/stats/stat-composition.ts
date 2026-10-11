import type { Item } from "@schemas/item"
import { isSwitchable } from "../effects/defaults"
import type { BuildEffect } from "../effects/effect"
import { alwaysOnRankStats, isEffectOn } from "../effects/evaluate"
import {
	type BuildEffectsInput,
	type BuildStatsInput,
	computeBuildStats,
} from "./compute-build-stats"
import type { ComputedStats, StatName } from "./compute-stats"

export type StatPartKind =
	| "base"
	| "level"
	| "form"
	| "item"
	| "shards"
	| "ranks"
	| "effect"

/** One source's share of a stat's total, in the total's unit (attack speed in attacks per second). */
export type StatPart = {
	/** The source, unique in the build: "item-2" (two of one item), "effect-ghost". */
	id: string
	kind: StatPartKind
	label: string
	value: number
	/** Previewed, not in the build yet (a shop item, the stat shards). */
	preview?: true
}

export type StatComposition = Record<StatName, StatPart[]>

export type CompositionInput = Omit<BuildStatsInput, "items"> & {
	items: readonly Pick<Item, "name" | "stats">[]
}

export type CompositionOptions = {
	/** Items from this index on are previewed, not bought. */
	previewItemsFrom?: number
	/** The stat shards are previewed (the Runes tab). */
	previewShards?: boolean
}

type Stage = Omit<StatPart, "value"> & { input: BuildStatsInput }

// Below display precision: floats left over by the subtraction.
const EPSILON = 1e-9
const NO_EFFECTS: BuildEffectsInput = { available: [], overrides: {} }

function effectLabel({ name, effect }: BuildEffect) {
	const detail = effect.label ?? effect.part
	return detail ? `${name} · ${detail}` : name
}

/** A form's own always-on effect is part of the form (Rockets' range); a switchable one is an effect. */
function isFormPart({ effect }: BuildEffect) {
	return !!effect.form && !isSwitchable(effect)
}

/** The champion alone at its level, in its default form: no items, shards, ranks or effects. */
function bareInput(input: CompositionInput): BuildStatsInput {
	return {
		...input,
		form: undefined,
		items: [],
		shards: [],
		ranks: undefined,
		statRanks: undefined,
		effects: undefined,
	}
}

/**
 * The effects stages. An effect that reads a rank stat replaces it while available, on or off,
 * so those stay available (off until their stage) from the ranks stage on.
 */
function effectStages(
	withRanks: BuildStatsInput,
	effects: BuildEffectsInput,
): Stage[] {
	const rankStats = withRanks.champion.rankStats
	const readsRank = new Set(
		effects.available
			.filter(
				(effect) =>
					(alwaysOnRankStats(rankStats, [effect])?.length ?? 0) <
					(rankStats?.length ?? 0),
			)
			.map(({ id }) => id),
	)
	const on = effects.available.filter((effect) =>
		isEffectOn(effect, effects.overrides),
	)
	function stageEffects(reached: ReadonlySet<string>): BuildEffectsInput {
		const overrides: Record<string, boolean> = { ...effects.overrides }
		for (const id of readsRank) {
			if (!reached.has(id)) overrides[id] = false
		}
		return {
			...effects,
			available: effects.available.filter(
				({ id }) => reached.has(id) || readsRank.has(id),
			),
			overrides,
		}
	}
	const ranksStage: Stage = {
		id: "ranks",
		kind: "ranks",
		label: "Ability ranks",
		input: { ...withRanks, effects: stageEffects(new Set()) },
	}
	return [
		ranksStage,
		...on.map((effect, index) => ({
			id: `effect-${effect.id}`,
			kind: isFormPart(effect) ? ("form" as const) : ("effect" as const),
			label: effectLabel(effect),
			input: {
				...withRanks,
				effects: stageEffects(
					new Set(on.slice(0, index + 1).map(({ id }) => id)),
				),
			},
		})),
	]
}

/** The input built up one source at a time, in the engine's order. */
function stages(
	input: CompositionInput,
	{
		previewItemsFrom = input.items.length,
		previewShards = false,
	}: CompositionOptions,
): Stage[] {
	const {
		champion,
		form,
		items,
		shards,
		ranks,
		statRanks,
		effects = NO_EFFECTS,
	} = input
	const bare = bareInput(input)
	const formName = champion.forms?.find(({ id }) => id === form)?.name
	const withItems = { ...bare, form, items }
	return [
		...(formName
			? [
					{
						id: "form",
						kind: "form" as const,
						label: formName,
						input: { ...bare, form },
					},
				]
			: []),
		...items.map((item, index) => ({
			id: `item-${index}`,
			kind: "item" as const,
			label: item.name,
			...(index >= previewItemsFrom && { preview: true as const }),
			input: { ...withItems, items: items.slice(0, index + 1) },
		})),
		{
			id: "shards",
			kind: "shards",
			label: "Stat shards",
			...(previewShards && { preview: true as const }),
			input: { ...withItems, shards },
		},
		...effectStages({ ...withItems, shards, ranks, statRanks }, effects),
	]
}

/**
 * Each stat's total split by source, by subtraction: a source's part is what the totals gain when
 * it joins the sources before it, so the parts add up to the total. Where sources interact (attack
 * speed ratio and multipliers, percent-of-total bonuses, Adaptive Force, the movement speed soft
 * caps) the later source carries the interaction (issue 435).
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
			{
				id: "base",
				kind: "base",
				label: `Base at level ${input.level}`,
				value: base,
			},
			...(Math.abs(bonus) > EPSILON
				? [
						{
							id: "level",
							kind: "level" as const,
							label: "Level growth",
							value: bonus,
						},
					]
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
