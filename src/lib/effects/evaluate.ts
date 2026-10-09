import type { AbilitySlot, Champion, RankStat } from "@schemas/champion"
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
	Resist,
	StacksThreshold,
	TableAmount,
} from "./effect"
import { GAME_START, gameTimeSteps, triangularSteps } from "./game-time"
import {
	type MatchStacks,
	reachesThreshold,
	stacksOf,
	withMatchStacks,
} from "./match-stacks"
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
	/** The match stacks by source, which `matchStacks` amounts read; absent means none. */
	matchStacks?: MatchStacks
	/** What Adaptive Force grants become; without it, they have no value. */
	adaptiveType?: AdaptiveType
	/** The totals `stat` amounts read: the build's before the stat-dependent bonuses. */
	totals?: ComputedStats
	/** The totals `percentOfTotal` amounts read: the build's with every flat bonus, before them. */
	percentBasis?: ComputedStats
	/** The champion's form id (its default's when it has forms); a form-bound effect holds only in its own. */
	form?: string
	/** Stacks an effect has by its id (the combat simulator's); absent means its full value, all stacks. */
	stacks?: Readonly<Record<string, number>>
	/** Effects whose `pauses` holds now, by id (the combat simulator's): their paused stat grants give nothing. */
	paused?: ReadonlySet<string>
	/** Seconds since each effect last triggered, by id (the combat simulator's); absent means at its trigger, its peak. */
	elapsed?: Readonly<Record<string, number>>
	/** Melee or ranged in the form and at the level, which `attackType` amounts read. */
	attackType?: Champion["attackType"]
}

/** A stat grant that reads another stat: `ratio` of its total, or of its bonus part. */
export type StatBasis = { stat: StatName; ratio: number; part?: "bonus" }

/** A grant's own clock (`GrantTiming`) in seconds and at the grant's value. */
export type ResolvedTiming = {
	duration?: number
	decay?: { over?: number; to: number }
}

/** A grant's value at the build's state; damage grants have none here (the combat simulator deals them). */
export type ResolvedGrant = { timing?: ResolvedTiming } & (
	| { kind: "stat"; stat: StatKey; value: number; basis?: StatBasis }
	| { kind: "attackSpeedMultiplier"; of: "bonus" | "total"; value: number }
	| { kind: "shield"; value: number }
	| { kind: "heal"; value: number }
	| {
			kind: "resistReduction"
			resist: Resist
			mode: "flat" | "percent"
			value: number
	  }
	| { kind: "counter"; counter: string; value: number }
)

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
			const ratio = resolveAmount(amount.ratio, effect, context)
			const read = context.totals?.[amount.stat][amount.part ?? "total"]
			return ratio === undefined || read === undefined
				? undefined
				: read * ratio
		}
		case "percentOfTotal": {
			const ratio = resolveTableAmount(amount.ratio, effect, context)
			const read = context.percentBasis?.[amount.stat].total
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
		case "matchStacks": {
			const stacks = stacksOf(context.matchStacks, amount.source)
			if (amount.steps) return bracketValue(amount.steps, stacks) ?? 0
			const ratio = resolveAmount(amount.ratio ?? 1, effect, context)
			if (ratio === undefined) return undefined
			const value = Math.floor(stacks / (amount.per ?? 1)) * ratio
			return Math.min(value, amount.max ?? Number.POSITIVE_INFINITY)
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

/** What a `stat` or `percentOfTotal` amount reads, at the build's ranks. */
function statBasis(
	amount: Amount,
	effect: BuildEffect,
	context: EffectContext,
): StatBasis | undefined {
	if (typeof amount === "number") return undefined
	if (amount.by === "percentOfTotal") {
		const ratio = resolveTableAmount(amount.ratio, effect, context)
		return ratio === undefined ? undefined : { stat: amount.stat, ratio }
	}
	if (amount.by !== "stat") return undefined
	const ratio = resolveAmount(amount.ratio, effect, context)
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

/** The share of its full value an effect holds at its stacks (Relentless Assault at 2 of 8: 2/8; Rev'd up by its `shares`; Vi's W: none until 3). */
function stackShare({ id, effect }: BuildEffect, { stacks }: EffectContext) {
	const count = stacks?.[id]
	if (!effect.stacks || count === undefined) return 1
	const { max, onlyAtMax, shares } = effect.stacks
	if (onlyAtMax) return count >= max ? 1 : 0
	const capped = Math.min(count, max)
	return shares?.[capped - 1] ?? capped / max
}

/** A stat grant its effect's pause switches off now (Viego's E movement speed after an attack). */
function isPaused(
	grant: Grant,
	{ id, effect }: BuildEffect,
	{ paused }: EffectContext,
) {
	return (
		grant.kind === "stat" &&
		!!paused?.has(id) &&
		!!effect.pauses?.grants.some((stat) => stat === grant.stat)
	)
}

/** The grant's own end and decay at the build's state, when it has them. */
function grantTiming(
	{ duration, decay }: Grant,
	effect: BuildEffect,
	context: EffectContext,
): ResolvedTiming | undefined {
	if (duration === undefined && !decay) return undefined
	const seconds =
		duration === undefined
			? undefined
			: resolveAmount(duration, effect, context)
	const over =
		decay?.over === undefined
			? (seconds ?? effectDuration(effect, context))
			: resolveAmount(decay.over, effect, context)
	const to =
		decay?.to === undefined
			? 0
			: (resolveAmount(decay.to, effect, context) ?? 0)
	return {
		...(seconds !== undefined && { duration: seconds }),
		...(decay && { decay: { ...(over !== undefined && { over }), to } }),
	}
}

/**
 * Its value `elapsed` seconds after the trigger: none once its duration is over, decayed in a
 * straight line toward `to`. Without `elapsed` (the stats panel), its peak.
 */
function valueAt(
	value: number,
	timing: ResolvedTiming,
	elapsed: number | undefined,
): number | undefined {
	if (elapsed === undefined) return value
	if (timing.duration !== undefined && elapsed >= timing.duration) {
		return undefined
	}
	const { decay } = timing
	if (!decay?.over) return value
	const progress = Math.min(1, elapsed / decay.over)
	return value + (decay.to - value) * progress
}

function resolveGrant(
	grant: Grant,
	effect: BuildEffect,
	context: EffectContext,
): ResolvedGrant[] {
	if (isPaused(grant, effect, context)) return []
	if (grant.from && !reachesThreshold(context.matchStacks, grant.from)) {
		return []
	}
	if (grant.atMaxStacks && stackShare(effect, context) < 1) return []
	const share = stackShare(effect, context)
	const timing = grantTiming(grant, effect, context)
	const elapsed = context.elapsed?.[effect.id]
	return resolveFullGrant(grant, effect, context).flatMap((resolved) => {
		if (!timing) return [{ ...resolved, value: resolved.value * share }]
		const value = valueAt(resolved.value, timing, elapsed)
		return value === undefined
			? []
			: [{ ...resolved, value: value * share, timing }]
	})
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
		case "resistReduction": {
			const value = resolveAmount(grant.amount, effect, context)
			const { kind, resist, mode } = grant
			return value === undefined ? [] : [{ kind, resist, mode, value }]
		}
		case "counter": {
			const value = resolveAmount(grant.amount, effect, context)
			const { kind, counter } = grant
			return value === undefined ? [] : [{ kind, counter, value }]
		}
		case "damage":
		case "abilityDamage":
		case "damageOverTime":
		case "onAttackDamage":
		case "cooldownMultiplier":
		case "attackMultiplier":
		case "damageAmplification":
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

/** Grants a stack threshold still holds back, at the count that unlocks them. */
export type LockedGrants = {
	threshold: StacksThreshold
	grants: readonly ResolvedGrant[]
}

/** The effect's grants whose threshold the build's stacks haven't reached, each as it gives at its threshold. */
export function lockedGrants(
	effect: BuildEffect,
	context: EffectContext,
): LockedGrants[] {
	return effect.effect.grants.flatMap((grant) => {
		const threshold = grant.from
		if (!threshold || reachesThreshold(context.matchStacks, threshold)) {
			return []
		}
		const { source, stacks } = threshold
		const matchStacks = withMatchStacks(context.matchStacks, source.id, stacks)
		const grants = resolveGrant(grant, effect, { ...context, matchStacks })
		return grants.length ? [{ threshold, grants }] : []
	})
}

/** The counts an ability's damage formulas read, by `counter` name (Siphoning Strike's `stacks`). */
export type AbilityCounters = Readonly<Record<string, number>>

/** The `counter` grants of the effects whose source is `ability`, summed by name. */
export function abilityCounters(
	effects: readonly BuildEffect[],
	context: EffectContext,
	ability: AbilitySlot | "passive",
): AbilityCounters {
	const counters: Record<string, number> = {}
	for (const effect of effects) {
		const { source } = effect.effect
		if (source.kind !== "ability" || source.slot !== ability) continue
		for (const resolved of resolveGrants(effect, context)) {
			if (resolved.kind === "counter") {
				counters[resolved.counter] =
					(counters[resolved.counter] ?? 0) + resolved.value
			}
		}
	}
	return counters
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

/**
 * When a grant's stats apply (evaluation order): with the other effects; after them, reading the
 * totals (`stat`); or last, reading the totals with every flat bonus (`percentOfTotal`).
 */
export type EvaluationStep = "effects" | "stat-dependent" | "percent-of-total"

function stepOf(grant: Grant): EvaluationStep {
	if (grant.kind !== "stat" || typeof grant.amount !== "object") {
		return "effects"
	}
	if (grant.amount.by === "stat") return "stat-dependent"
	if (grant.amount.by === "percentOfTotal") return "percent-of-total"
	return "effects"
}

export type EffectStatsOptions = {
	/** Which grants to sum: the ones of the active effects step (default), the stat-dependent or the percent-of-total ones. */
	step?: EvaluationStep
}

/**
 * The active effects' stats of one evaluation step, as one more stat source for `computeStats`,
 * next to the items. The `stat-dependent` step needs `context.totals`, `percent-of-total` needs
 * `context.percentBasis`.
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
 * stat-dependent and percent-of-total bonuses (evaluation step 6), so no bonus reads a multiplied
 * attack speed.
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
