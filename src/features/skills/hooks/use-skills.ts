import type { AbilitySlot, Champion } from "@schemas/champion"
import { useState } from "react"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import { abilityRanksAt } from "../lib/ability-ranks"
import {
	fillRecommended,
	levelPoints,
	nextSuggestion,
	placePoint,
	removeBlocker,
	removePoint,
	type SkillPicks,
	spendBlocker,
	spendLevel,
	spendPoint,
	withKeptPicks,
} from "../lib/skill-history"
import { parseOrder, ranksOf, serializeOrder } from "../lib/skill-order"
import { pointSlots, skillRulesOf } from "../lib/skill-rules"

type UseSkillsOptions = {
	champion:
		| Pick<Champion, "key" | "abilities" | "skillRules" | "rankStats">
		| undefined
	level: number
	/** The spent points as the `skills` URL value ("EQWE"): only the points up to `level`. */
	value: string | undefined
	onChange: (value: string | undefined) => void
}

type RememberedPicks = { championKey: string; picks: SkillPicks }

export type Skills = ReturnType<typeof useSkills>

/**
 * The champion's skill points, controlled by `value`: only spent points count. It also remembers
 * the points above `level` so raising the level brings them back; the value never carries them.
 */
export function useSkills({
	champion,
	level,
	value,
	onChange,
}: UseSkillsOptions) {
	const [remembered, setRemembered] = useState<RememberedPicks>()
	const rules = champion && skillRulesOf(champion)
	const linkPicks = rules ? parseOrder(value, rules) : []
	const picks = withKeptPicks(
		remembered?.championKey === champion?.key ? remembered?.picks : undefined,
		linkPicks,
		level,
	)
	const spent = picks.slice(0, level)
	const spentCount = spent.filter(Boolean).length
	const ranks = rules && ranksOf(spent, rules)

	function commit(next: SkillPicks | undefined) {
		if (!champion || !next) return
		setRemembered({ championKey: champion.key, picks: next })
		onChange(serializeOrder(next.slice(0, level)))
	}

	return {
		/** The abilities that take points, in slot order (no R for Aphelios). */
		pointSlots: rules ? pointSlots(rules) : [],
		/** The stats the points buy, when they raise stats instead of abilities (Aphelios). */
		statPoints: champion?.skillRules?.statPoints && champion.rankStats,
		/** The recommended max order ("R, E, Q, W"). */
		suggestedPriority: rules?.recommended.priority ?? [],
		/** What each level 1 to 18 holds: spent, unspent, kept above the level or not reached. */
		levels: rules ? levelPoints(picks, { level, rules }) : [],
		/** Each slot's rank from the spent points; suggestions never count. What the rank stats read. */
		ranks,
		/** Each ability's rank: `ranks`, or the level's own for a champion whose points raise stats (Aphelios). */
		abilityRanks:
			rules && ranks && abilityRanksAt(rules, { level, pointRanks: ranks }),
		spentCount,
		/** Points up to the current level not spent yet, gaps included. */
		unspentCount: level - spentCount,
		/** The recommended ability for the first unspent level: only a hint. */
		suggestion: rules && nextSuggestion(picks, { level, rules })?.slot,
		/** Points kept above the current level, restored when the level goes back up. */
		keptCount: picks.slice(level).filter(Boolean).length,
		/** Why `slot` cannot take the next point; undefined when it can. */
		spendBlocker: (slot: AbilitySlot) =>
			rules ? spendBlocker(picks, { slot, level, rules }) : undefined,
		/** The level one more point in `slot` goes to: the earliest unspent one that can take it. */
		spendLevel: (slot: AbilitySlot) =>
			rules ? spendLevel(picks, { slot, level, rules }) : undefined,
		/** Spends one more point on `slot`, at its `spendLevel`. */
		spend: (slot: AbilitySlot) =>
			rules && commit(spendPoint(picks, { slot, level, rules })),
		canPlace: (pointLevel: number, slot: AbilitySlot) =>
			!!rules && !!placePoint(picks, { slot, pointLevel, level, rules }),
		/** Puts the point of `pointLevel` on `slot`: changes a spent point or spends an unspent one. */
		place: (pointLevel: number, slot: AbilitySlot) =>
			rules && commit(placePoint(picks, { slot, pointLevel, level, rules })),
		/** Why the point of `pointLevel` cannot be removed: a later point needs it. */
		removeBlocker: (pointLevel: number) =>
			rules ? removeBlocker(picks, { pointLevel, level, rules }) : undefined,
		/** Removes the point of `pointLevel`, leaving that level unspent. */
		remove: (pointLevel: number) =>
			rules && commit(removePoint(picks, { pointLevel, level, rules })),
		/** Spends every point left with the recommended order. */
		fillRecommended: () =>
			rules && commit(fillRecommended(picks, { level, rules })),
		/** Clears every point, kept ones included. */
		reset: () => commit([]),
		/**
		 * Remembers the points for a level change and returns the `value` at `nextLevel`, to save with
		 * the new level: lowering keeps the points above it, raising brings them back.
		 */
		valueAtLevel(nextLevel: number) {
			if (champion && picks.length > Math.min(level, nextLevel)) {
				setRemembered({ championKey: champion.key, picks })
			}
			return serializeOrder(picks.slice(0, nextLevel))
		},
		/** `ranks` with `slot` one rank higher: the base of the rank-up preview. */
		ranksWithNext: (slot: AbilitySlot): AbilityRanks | undefined =>
			ranks && { ...ranks, [slot]: ranks[slot] + 1 },
		/** The points up to the current level, cleaned of invalid ones: the value for links. */
		value: serializeOrder(spent),
	}
}
