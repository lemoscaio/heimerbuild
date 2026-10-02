import type { AbilitySlot } from "@schemas/champion"
import { autoFill, isValidOrder, ranksOf, type SkillOrder } from "./skill-order"
import type { SkillRules } from "./skill-rules"

/**
 * The points the user picked, level 1 first. Like browser history it may run past the current
 * level: lowering the level keeps those points, raising it again brings them back.
 */
export type SkillPicks = SkillOrder

export type SkillPoint = {
	slot: AbilitySlot
	/** Filled by the suggested order, not picked. */
	isAuto: boolean
	/** The rank this point takes its ability to. */
	rank: number
}

type AtLevel = { level: number; rules: SkillRules }

/** The point of every level up to `level`: the picks, then the suggested points. */
export function skillPointsAt(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): SkillPoint[] {
	const visible = picks.slice(0, level)
	const order = autoFill(visible, { level, rules })
	return order.map((slot, index) => ({
		slot,
		isAuto: index >= visible.length,
		rank: ranksOf(order.slice(0, index + 1), rules)[slot],
	}))
}

/**
 * `picks` with the point of `pointLevel` (at most `level`) on `slot`; undefined when the rules
 * forbid it. Suggested points before it become picks. A different pick drops the points kept
 * above `level`, as a new page drops the browser's forward history.
 */
export function placePoint(
	picks: SkillPicks,
	{
		slot,
		pointLevel,
		level,
		rules,
	}: AtLevel & {
		slot: AbilitySlot
		pointLevel: number
	},
): SkillPicks | undefined {
	if (pointLevel < 1 || pointLevel > level) return undefined
	const visible = picks.slice(0, level)
	if (visible[pointLevel - 1] === slot) return picks
	const filled = autoFill(visible, { level, rules })
	const next = filled.slice(0, Math.max(pointLevel, visible.length))
	next[pointLevel - 1] = slot
	return isValidOrder(next, rules) ? next : undefined
}

/**
 * `picks` with one more point in `slot`: the first suggested point that is another ability's
 * moves to `slot`. Undefined when no suggested point can move there.
 */
export function spendPoint(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SkillPicks | undefined {
	for (const [index, point] of skillPointsAt(picks, {
		level,
		rules,
	}).entries()) {
		if (!point.isAuto || point.slot === slot) continue
		const next = placePoint(picks, {
			slot,
			pointLevel: index + 1,
			level,
			rules,
		})
		if (next) return next
	}
	return undefined
}

/** Why `slot` cannot take one more point, as the rank-up tooltip explains it. */
export type SpendBlocker =
	| { reason: "max-rank" }
	| { reason: "all-picked" }
	| { reason: "needs-level"; level: number }
	| { reason: "needs-ability"; abilities: readonly AbilitySlot[] }
	| { reason: "no-point" }

export function spendBlocker(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SpendBlocker | undefined {
	if (spendPoint(picks, { slot, level, rules })) return undefined
	const rule = rules.abilities[slot]
	const ranks = ranksOf(
		skillPointsAt(picks, { level, rules }).map((point) => point.slot),
		rules,
	)
	const nextRankLevel = rule.rankLevels[ranks[slot]]
	if (ranks[slot] >= rule.maxRank) return { reason: "max-rank" }
	if (Math.min(picks.length, level) >= level) return { reason: "all-picked" }
	if (rule.requires && !rule.requires.some((required) => ranks[required] > 0)) {
		return { reason: "needs-ability", abilities: rule.requires }
	}
	if (nextRankLevel !== undefined && nextRankLevel > level) {
		return { reason: "needs-level", level: nextRankLevel }
	}
	return { reason: "no-point" }
}

/**
 * The full picks when `remembered` still agrees with the link, else the link's: `linkPicks` are
 * the picks up to `level`, so a remembered history must start with them and hold no more below `level`.
 */
export function withKeptPicks(
	remembered: SkillPicks | undefined,
	linkPicks: SkillPicks,
	level: number,
): SkillPicks {
	if (
		!remembered ||
		linkPicks.length !== Math.min(level, remembered.length) ||
		linkPicks.some((slot, index) => remembered[index] !== slot)
	) {
		return linkPicks
	}
	return remembered
}
