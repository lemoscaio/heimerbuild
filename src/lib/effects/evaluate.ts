import type { Champion, RankStat } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import { type AdaptiveType, adaptiveForceStat } from "../stats/adaptive-force"
import type { AttackSpeedMultipliers } from "../stats/attack-speed"
import type { ComputedStats, ItemInput, StatName } from "../stats/compute-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import { spellCooldown } from "../summoner-rune-interactions"
import { FULL_HEALTH } from "./current-health"
import { isOnByDefault, isSwitchable } from "./defaults"
import type {
	Amount,
	BuildEffect,
	EffectOverrides,
	Grant,
	GrantStat,
	RankValueAmount,
	TableAmount,
} from "./effect"
import { GAME_START, gameTimeSteps, triangularSteps } from "./game-time"
import { resolveStacking, type StackingResult } from "./stacking"

/** The build's state the amounts are read at. */
export type EffectContext = {
	level: number
	ranks?: AbilityRanks
	/** The champion's rank stats, which `rank` amounts read. */
	rankStats?: Champion["rankStats"]
	/** Percent of maximum health the champion is at, 1 to 100; absent means full health. */
	currentHealth?: number
	/** Whole minutes into the game, which `gameTime` amounts read; absent means its start. */
	gameTime?: number
	/** What Adaptive Force grants become; without it, they have no value. */
	adaptiveType?: AdaptiveType
	/** The totals `stat` amounts read: the build's before the stat-dependent bonuses. */
	totals?: ComputedStats
	/** The champion's form id (its default's when it has forms); a form-bound effect holds only in its own. */
	form?: string
	/** Stacks an effect has by its id (the combat simulator's); absent means its full value, all stacks. */
	stacks?: Readonly<Record<string, number>>
	/** Melee or ranged in the form and at the level, which `attackType` amounts read. */
	attackType?: Champion["attackType"]
}

/** A stat grant that reads another stat: `ratio` of its total, or of its bonus part. */
export type StatBasis = { stat: StatName; ratio: number; part?: "bonus" }

/** A grant's value at the build's state; damage grants have none here (the combat simulator deals them). */
export type ResolvedGrant =
	| { kind: "stat"; stat: StatKey; value: number; basis?: StatBasis }
	| { kind: "attackSpeedMultiplier"; of: "bonus" | "total"; value: number }
	| { kind: "shield"; value: number }
	| { kind: "heal"; value: number }

/** The value of the last bracket or step whose `from` the value reached. */
function bracketValue(
	brackets: readonly { from: number; value: number }[],
	reached: number,
) {
	return brackets.findLast(({ from }) => reached >= from)?.value
}

function scaled(value: number | undefined, scale = 1) {
	return value === undefined ? undefined : value * scale
}

/** A `rankValue` line at its ability's rank: the effect's own, or the boosting `slot`'s (its `unranked` value until it has a point). */
function rankValueAt(
	amount: RankValueAmount,
	{ slot, rankValues, boosts }: BuildEffect,
	ranks: EffectContext["ranks"],
) {
	const lineSlot = amount.slot ?? slot
	const rank = lineSlot && ranks ? ranks[lineSlot] : 0
	if (rank === 0 && amount.unranked !== undefined) return amount.unranked
	const lines =
		amount.slot && amount.slot !== slot
			? boosts?.[amount.slot]?.rankValues
			: rankValues
	const line = lines?.find(({ label }) => label === amount.label)
	return scaled(line?.values[rank - 1], amount.scale)
}

function resolveTableAmount(
	amount: TableAmount,
	effect: BuildEffect,
	{ level, ranks, rankStats }: EffectContext,
): number | undefined {
	const { slot, spell } = effect
	if (typeof amount === "number") return amount
	const rank = slot && ranks ? ranks[slot] : 0
	switch (amount.by) {
		case "level":
			return scaled(spell?.values[amount.value]?.[level - 1], amount.scale)
		case "rank": {
			const values = rankStats?.find(
				(rankStat) =>
					rankStat.slot === slot && rankStat.stat === amount.rankStat,
			)?.values
			return scaled(values?.[rank - 1], amount.scale)
		}
		case "rankValue":
			return rankValueAt(amount, effect, ranks)
		case "summonerCooldown":
			return spell && bracketValue(amount.brackets, spellCooldown(spell))
		case "championLevel":
			return bracketValue(amount.steps, level)
	}
}

/** The amount's number at the build's state; undefined when the data lacks it, or a stat-reading amount without totals. */
export function resolveAmount(
	amount: Amount,
	effect: BuildEffect,
	context: EffectContext,
): number | undefined {
	if (typeof amount === "number") return amount
	switch (amount.by) {
		case "stat": {
			const ratio = resolveTableAmount(amount.ratio, effect, context)
			const read = context.totals?.[amount.stat][amount.part ?? "total"]
			return ratio === undefined || read === undefined
				? undefined
				: read * ratio
		}
		case "missingHealth": {
			const max = resolveTableAmount(amount.max, effect, context)
			const missing = FULL_HEALTH - (context.currentHealth ?? FULL_HEALTH)
			return max === undefined
				? undefined
				: max * Math.min(1, missing / amount.fullAt)
		}
		case "gameTime": {
			const step = resolveTableAmount(amount.step, effect, context)
			const steps = gameTimeSteps(amount.every, context.gameTime ?? GAME_START)
			return step === undefined ? undefined : step * triangularSteps(steps)
		}
		case "statDecay": {
			const read = context.totals?.[amount.stat].total
			return read === undefined
				? undefined
				: amount.base * amount.factor ** (read / amount.per)
		}
		case "attackType":
			return (
				context.attackType &&
				resolveTableAmount(amount[context.attackType], effect, context)
			)
		default:
			return resolveTableAmount(amount, effect, context)
	}
}

/** What a `stat` amount reads, at the build's ranks. */
function statBasis(
	amount: Amount,
	effect: BuildEffect,
	context: EffectContext,
): StatBasis | undefined {
	if (typeof amount === "number" || amount.by !== "stat") return undefined
	const ratio = resolveTableAmount(amount.ratio, effect, context)
	if (ratio === undefined) return undefined
	const { stat, part } = amount
	return part ? { stat, ratio, part } : { stat, ratio }
}

/** The stat a grant's value goes to: Adaptive Force becomes AD or AP by the build's adaptive type. */
function grantStat(
	stat: GrantStat,
	value: number | undefined,
	{ adaptiveType }: EffectContext,
): { stat: StatKey; value: number } | undefined {
	if (value === undefined) return undefined
	if (stat !== "adaptiveForce") return { stat, value }
	return adaptiveType && adaptiveForceStat(value, adaptiveType)
}

/** The share of its full value an effect holds at its stacks (Rev'd up at 2 of 3 stacks: 2/3). */
function stackShare({ id, effect }: BuildEffect, { stacks }: EffectContext) {
	const count = stacks?.[id]
	if (!effect.stacks || count === undefined) return 1
	return Math.min(count, effect.stacks.max) / effect.stacks.max
}

function resolveGrant(
	grant: Grant,
	effect: BuildEffect,
	context: EffectContext,
): ResolvedGrant[] {
	const share = stackShare(effect, context)
	const full = resolveFullGrant(grant, effect, context)
	return share === 1
		? full
		: full.map((resolved) => ({ ...resolved, value: resolved.value * share }))
}

function resolveFullGrant(
	grant: Grant,
	effect: BuildEffect,
	context: EffectContext,
): ResolvedGrant[] {
	switch (grant.kind) {
		case "stat": {
			const amount = resolveAmount(grant.amount, effect, context)
			const stat = grantStat(grant.stat, amount, context)
			const basis = statBasis(grant.amount, effect, context)
			return stat ? [{ kind: "stat", ...stat, ...(basis && { basis }) }] : []
		}
		case "attackSpeedMultiplier": {
			const value = resolveAmount(grant.amount, effect, context)
			return value === undefined
				? []
				: [{ kind: grant.kind, of: grant.of, value }]
		}
		case "shield":
		case "heal": {
			const value = resolveAmount(grant.amount, effect, context)
			return value === undefined ? [] : [{ kind: grant.kind, value }]
		}
		case "damage":
		case "abilityDamage":
		case "damageOverTime":
		case "onAttackDamage":
			return []
	}
}

/** What the effect grants at the build's state: its stats, shield and heal (the outputs). */
export function resolveGrants(
	effect: BuildEffect,
	context: EffectContext,
): ResolvedGrant[] {
	return effect.effect.grants.flatMap((grant) =>
		resolveGrant(grant, effect, context),
	)
}

/** The user's choice for the effect, else its default; an effect without a switch keeps its default. */
export function isEffectOn(
	{ id, effect }: BuildEffect,
	overrides: EffectOverrides,
): boolean {
	const choice = isSwitchable(effect) ? overrides[id] : undefined
	return choice ?? isOnByDefault(effect)
}

/** An effect's size, to compare effects of a `highest` group: its grants' values summed. */
export function effectValue(effect: BuildEffect, context: EffectContext) {
	return resolveGrants(effect, context).reduce(
		(sum, { value }) => sum + value,
		0,
	)
}

/** Whether the effect holds in the champion's form: one bound to a form holds only in it. */
export function isInForm({ effect }: BuildEffect, form: string | undefined) {
	return effect.form === undefined || effect.form === form
}

/** The effects that are on in the champion's form, after each stacking group picked the ones that apply. */
export function stackEffects(
	available: readonly BuildEffect[],
	overrides: EffectOverrides,
	context: EffectContext,
): StackingResult {
	return resolveStacking(
		available.filter(
			(effect) =>
				isInForm(effect, context.form) && isEffectOn(effect, overrides),
		),
		(effect) => effectValue(effect, context),
	)
}

/** The effects that apply: on, and not stacked out by another of their group. */
export function activeEffects(
	available: readonly BuildEffect[],
	overrides: EffectOverrides,
	context: EffectContext,
): BuildEffect[] {
	return stackEffects(available, overrides, context).active
}

/** Seconds the effect lasts at the build's state, when it says. */
export function effectDuration(
	effect: BuildEffect,
	context: EffectContext,
): number | undefined {
	const { duration } = effect.effect
	return duration === undefined
		? undefined
		: resolveAmount(duration, effect, context)
}

/** When a grant's stats apply (evaluation order): with the other effects, or after them, reading the totals. */
export type EvaluationStep = "effects" | "stat-dependent"

function stepOf(grant: Grant): EvaluationStep {
	return grant.kind === "stat" &&
		typeof grant.amount === "object" &&
		grant.amount.by === "stat"
		? "stat-dependent"
		: "effects"
}

export type EffectStatsOptions = {
	/** Which grants to sum: the ones of the active effects step (default) or the stat-dependent ones. */
	step?: EvaluationStep
}

/**
 * The active effects' stats of one evaluation step, as one more stat source for `computeStats`,
 * next to the items. The `stat-dependent` step needs `context.totals`.
 */
export function effectStatsInput(
	active: readonly BuildEffect[],
	context: EffectContext,
	{ step = "effects" }: EffectStatsOptions = {},
): ItemInput {
	const stats: Partial<Record<StatKey, number>> = {}
	for (const effect of active) {
		for (const grant of effect.effect.grants) {
			if (stepOf(grant) !== step) continue
			for (const resolved of resolveGrant(grant, effect, context)) {
				if (resolved.kind === "stat") {
					stats[resolved.stat] = (stats[resolved.stat] ?? 0) + resolved.value
				}
			}
		}
	}
	return { stats }
}

/**
 * The active effects' attack speed multipliers, summed by what they scale. They apply after the
 * stat-dependent bonuses (evaluation step 5), so no bonus reads a multiplied attack speed.
 */
export function attackSpeedMultipliers(
	active: readonly BuildEffect[],
	context: EffectContext,
): AttackSpeedMultipliers {
	const multipliers = { bonus: 0, total: 0 }
	for (const effect of active) {
		for (const resolved of resolveGrants(effect, context)) {
			if (resolved.kind === "attackSpeedMultiplier") {
				multipliers[resolved.of] += resolved.value
			}
		}
	}
	return multipliers
}

function readsRankStat(effect: BuildEffect, rankStat: RankStat) {
	return (
		effect.slot === rankStat.slot &&
		effect.effect.grants.some(
			(grant) =>
				grant.kind === "stat" &&
				typeof grant.amount === "object" &&
				grant.amount.by === "rank" &&
				grant.amount.rankStat === rankStat.stat,
		)
	)
}

/**
 * The rank stats that always apply: a rank stat an available effect reads is that effect's,
 * so it applies only while the effect is on (Teemo's W passive).
 */
export function alwaysOnRankStats(
	rankStats: Champion["rankStats"],
	available: readonly BuildEffect[],
): Champion["rankStats"] {
	return rankStats?.filter(
		(rankStat) => !available.some((effect) => readsRankStat(effect, rankStat)),
	)
}
