import type { AbilitySlot } from "@schemas/champion"
import { autoFill, isValidOrder, type SkillOrder } from "./skill-order"
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
}

type AtLevel = { level: number; rules: SkillRules }

/** The point of every level up to `level`: the picks, then the suggested points. */
export function skillPointsAt(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): SkillPoint[] {
	const visible = picks.slice(0, level)
	return autoFill(visible, { level, rules }).map((slot, index) => ({
		slot,
		isAuto: index >= visible.length,
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

/** `picks` with the first suggested point on `slot`; undefined when every point is picked or the rules forbid it. */
export function spendPoint(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SkillPicks | undefined {
	const picked = Math.min(picks.length, level)
	if (picked >= level) return undefined
	return placePoint(picks, { slot, pointLevel: picked + 1, level, rules })
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
