import type { Champion, RankStat } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { ItemInput } from "../stats/compute-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import { spellCooldown } from "../summoner-rune-interactions"
import { isOnByDefault } from "./defaults"
import type {
	Amount,
	BuildEffect,
	CooldownBracket,
	EffectOverrides,
	Grant,
} from "./effect"
import { resolveStacking, type StackingResult } from "./stacking"

/** The build's state the amounts are read at. */
export type EffectContext = {
	level: number
	ranks?: AbilityRanks
	/** The champion's rank stats, which `rank` amounts read. */
	rankStats?: Champion["rankStats"]
}

/** A grant's value at the build's state; damage has none until the combo timeline. */
export type ResolvedGrant =
	| { kind: "stat"; stat: StatKey; value: number }
	| { kind: "shield"; value: number }
	| { kind: "heal"; value: number }

function bracketValue(brackets: readonly CooldownBracket[], cooldown: number) {
	return brackets.findLast(({ from }) => cooldown >= from)?.value
}

function scaled(value: number | undefined, scale = 1) {
	return value === undefined ? undefined : value * scale
}

/** The amount's number at the build's state; undefined when the data lacks it. */
export function resolveAmount(
	amount: Amount,
	{ slot, spell }: Pick<BuildEffect, "slot" | "spell">,
	{ level, ranks, rankStats }: EffectContext,
): number | undefined {
	if (typeof amount === "number") return amount
	switch (amount.by) {
		case "level":
			return scaled(spell?.values[amount.value]?.[level - 1], amount.scale)
		case "rank": {
			const values = rankStats?.find(
				(rankStat) =>
					rankStat.slot === slot && rankStat.stat === amount.rankStat,
			)?.values
			const rank = slot && ranks ? ranks[slot] : 0
			return scaled(values?.[rank - 1], amount.scale)
		}
		case "summonerCooldown":
			return spell && bracketValue(amount.brackets, spellCooldown(spell))
	}
}

function resolveGrant(
	grant: Grant,
	effect: BuildEffect,
	context: EffectContext,
): ResolvedGrant[] {
	switch (grant.kind) {
		case "stat": {
			const value = resolveAmount(grant.amount, effect, context)
			return value === undefined
				? []
				: [{ kind: "stat", stat: grant.stat, value }]
		}
		case "shield":
		case "heal": {
			const value = resolveAmount(grant.amount, effect, context)
			return value === undefined ? [] : [{ kind: grant.kind, value }]
		}
		case "damage":
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

/** The user's choice for the effect, else its default. */
export function isEffectOn(
	{ id, effect }: BuildEffect,
	overrides: EffectOverrides,
): boolean {
	return overrides[id] ?? isOnByDefault(effect)
}

/** An effect's size, to compare effects of a `highest` group: its grants' values summed. */
export function effectValue(effect: BuildEffect, context: EffectContext) {
	return resolveGrants(effect, context).reduce(
		(sum, { value }) => sum + value,
		0,
	)
}

/** The effects that are on, after each stacking group picked the ones that apply. */
export function stackEffects(
	available: readonly BuildEffect[],
	overrides: EffectOverrides,
	context: EffectContext,
): StackingResult {
	return resolveStacking(
		available.filter((effect) => isEffectOn(effect, overrides)),
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

/** The active effects' stats as one more stat source for `computeStats`, next to the items. */
export function effectStatsInput(
	active: readonly BuildEffect[],
	context: EffectContext,
): ItemInput {
	const stats: Partial<Record<StatKey, number>> = {}
	for (const grant of active.flatMap((effect) =>
		resolveGrants(effect, context),
	)) {
		if (grant.kind === "stat") {
			stats[grant.stat] = (stats[grant.stat] ?? 0) + grant.value
		}
	}
	return { stats }
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
