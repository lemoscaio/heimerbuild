import type { AbilitySlot, Champion } from "@schemas/champion"
import { useState } from "react"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import {
	placePoint,
	type SkillPicks,
	skillPointsAt,
	spendPoint,
	withKeptPicks,
} from "../lib/skill-history"
import { parseOrder, ranksOf, serializeOrder } from "../lib/skill-order"
import { skillRulesOf } from "../lib/skill-rules"

type UseSkillsOptions = {
	champion: Pick<Champion, "key" | "abilities" | "skillRules"> | undefined
	level: number
	/** The picked points as the `skills` URL value ("EQWE"): only the points up to `level`. */
	value: string | undefined
	onChange: (value: string | undefined) => void
}

type RememberedPicks = { championKey: string; picks: SkillPicks }

export type Skills = ReturnType<typeof useSkills>

/**
 * The champion's skill points, controlled by `value`. It also remembers the picks above `level`
 * so raising the level brings them back; the value never carries them.
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
	const points = rules?.hasSkillOrder
		? skillPointsAt(picks, { level, rules })
		: []
	const ranks =
		rules &&
		ranksOf(
			points.map(({ slot }) => slot),
			rules,
		)

	function commit(next: SkillPicks | undefined) {
		if (!champion || !next) return
		setRemembered({ championKey: champion.key, picks: next })
		onChange(serializeOrder(next.slice(0, level)))
	}

	return {
		/** False for a champion whose points raise stats (Aphelios). */
		hasSkillOrder: !!rules?.hasSkillOrder,
		/** The point of each level up to the current one, picked or suggested. */
		points,
		/** Each ability's rank at the current level, suggested points included. */
		ranks,
		/** Picks above the current level, restored when the level goes back up. */
		keptPicks: picks.slice(level),
		pickedCount: Math.min(picks.length, level),
		canSpend: (slot: AbilitySlot) =>
			!!rules && !!spendPoint(picks, { slot, level, rules }),
		/** Puts the first suggested point on `slot`. */
		spend: (slot: AbilitySlot) =>
			rules && commit(spendPoint(picks, { slot, level, rules })),
		canPlace: (pointLevel: number, slot: AbilitySlot) =>
			!!rules && !!placePoint(picks, { slot, pointLevel, level, rules }),
		/** Puts the point of `pointLevel` on `slot`. */
		place: (pointLevel: number, slot: AbilitySlot) =>
			rules && commit(placePoint(picks, { slot, pointLevel, level, rules })),
		/** Back to the suggested order: drops every pick, kept ones included. */
		reset: () => commit([]),
		/**
		 * Remembers the picks for a level change and returns the `value` at `nextLevel`, to save with
		 * the new level: lowering keeps the picks above it, raising brings them back.
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
		/** The picks up to the current level, cleaned of invalid points: the value for links. */
		value: serializeOrder(picks.slice(0, level)),
	}
}
