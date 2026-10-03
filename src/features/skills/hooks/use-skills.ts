import type { AbilitySlot, Champion } from "@schemas/champion"
import { useState } from "react"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import {
	fillRecommended,
	levelPoints,
	nextSuggestion,
	placePoint,
	type SkillPicks,
	spendBlocker,
	spendLevel,
	spendPoint,
	withKeptPicks,
} from "../lib/skill-history"
import { parseOrder, ranksOf, serializeOrder } from "../lib/skill-order"
import { skillRulesOf } from "../lib/skill-rules"

type UseSkillsOptions = {
	champion: Pick<Champion, "key" | "abilities" | "skillRules"> | undefined
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
	const hasSkillOrder = !!rules?.hasSkillOrder

	function commit(next: SkillPicks | undefined) {
		if (!champion || !next) return
		setRemembered({ championKey: champion.key, picks: next })
		onChange(serializeOrder(next.slice(0, level)))
	}

	return {
		/** False for a champion whose points raise stats (Aphelios). */
		hasSkillOrder,
		/** The recommended max order ("R, E, Q, W"). */
		suggestedPriority: rules?.recommended.priority ?? [],
		/** What each level 1 to 18 holds: spent, unspent, kept above the level or not reached. */
		levels: rules && hasSkillOrder ? levelPoints(picks, { level, rules }) : [],
		/** Each ability's rank from the spent points; suggestions never count. */
		ranks,
		spentCount,
		/** Points up to the current level not spent yet, gaps included. */
		unspentCount: hasSkillOrder ? level - spentCount : 0,
		/** The recommended ability for the first unspent level: only a hint. */
		suggestion:
			rules && hasSkillOrder
				? nextSuggestion(picks, { level, rules })?.slot
				: undefined,
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
