import type { AbilitySlot } from "@schemas/champion"
import { MAX_LEVEL } from "@/lib/stats/growth"
import {
	isValidOrder,
	ranksOf,
	type SkillOrder,
	suggestedPoint,
	withRecommended,
} from "./skill-order"
import type { SkillRules } from "./skill-rules"

/**
 * The points the user spent, one per level, level 1 first. Like browser history it may run past
 * the current level: lowering the level keeps those points, raising it again brings them back.
 */
export type SkillPicks = SkillOrder

type AtLevel = { level: number; rules: SkillRules }

/** What each level 1 to 18 holds: the order strip and the grid columns. */
export type LevelPoint =
	/** A spent point, with the rank it takes its ability to. */
	| { level: number; state: "spent"; slot: AbilitySlot; rank: number }
	/** The next point to spend, with the recommended ability for it (never counted). */
	| { level: number; state: "next"; suggestion: AbilitySlot | undefined }
	/** A point to spend after the next one. */
	| { level: number; state: "unspent" }
	/** A point kept above the current level, back when the level goes up again. */
	| { level: number; state: "kept"; slot: AbilitySlot }
	| { level: number; state: "future" }

function spentAt(picks: SkillPicks, level: number): SkillOrder {
	return picks.slice(0, level)
}

/** The ability the recommended order suggests for the next point; undefined when none is left. */
export function nextSuggestion(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): AbilitySlot | undefined {
	const spent = spentAt(picks, level)
	return spent.length < level
		? suggestedPoint(spent, { level: spent.length + 1, rules })
		: undefined
}

export function levelPoints(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): LevelPoint[] {
	const spent = spentAt(picks, level)
	const suggestion = nextSuggestion(picks, { level, rules })
	return Array.from({ length: MAX_LEVEL }, (_, index): LevelPoint => {
		const pointLevel = index + 1
		const slot = picks[index]
		if (pointLevel <= spent.length && slot) {
			const rank = ranksOf(spent.slice(0, pointLevel), rules)[slot]
			return { level: pointLevel, state: "spent", slot, rank }
		}
		if (pointLevel === spent.length + 1 && pointLevel <= level) {
			return { level: pointLevel, state: "next", suggestion }
		}
		if (pointLevel <= level) return { level: pointLevel, state: "unspent" }
		if (slot) return { level: pointLevel, state: "kept", slot }
		return { level: pointLevel, state: "future" }
	})
}

/**
 * `picks` with the point of `pointLevel` on `slot`: a spent point changes, or the next one is
 * spent. Undefined when the rules forbid it. A different pick drops the points kept above
 * `level`, as a new page drops the browser's forward history.
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
	const spent = spentAt(picks, level)
	if (pointLevel < 1 || pointLevel > Math.min(spent.length + 1, level)) {
		return undefined
	}
	if (spent[pointLevel - 1] === slot) return picks
	const next = [...spent]
	next[pointLevel - 1] = slot
	return isValidOrder(next, rules) ? next : undefined
}

/** `picks` with the next point spent on `slot`; undefined when it cannot take it. */
export function spendPoint(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SkillPicks | undefined {
	return placePoint(picks, {
		slot,
		pointLevel: spentAt(picks, level).length + 1,
		level,
		rules,
	})
}

/** `picks` with every point left to spend up to `level` spent as the recommended order says. */
export function fillRecommended(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): SkillPicks {
	const spent = spentAt(picks, level)
	return spent.length < level ? withRecommended(spent, { level, rules }) : picks
}

/** Why `slot` cannot take the next point, as the rank-up tooltip explains it. */
export type SpendBlocker =
	| { reason: "max-rank" }
	| { reason: "no-points" }
	| { reason: "first-point"; ability: AbilitySlot }
	| { reason: "needs-ability"; abilities: readonly AbilitySlot[] }
	| { reason: "needs-level"; level: number }
	/** The rank's level is reached, but the next point is an earlier level's. */
	| { reason: "earlier-point"; pointLevel: number; rankLevel: number }

export function spendBlocker(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SpendBlocker | undefined {
	if (spendPoint(picks, { slot, level, rules })) return undefined
	const spent = spentAt(picks, level)
	const ranks = ranksOf(spent, rules)
	const rule = rules.abilities[slot]
	const pointLevel = spent.length + 1
	const rankLevel = rule.rankLevels[ranks[slot]]
	if (ranks[slot] >= rule.maxRank || rankLevel === undefined) {
		return { reason: "max-rank" }
	}
	if (spent.length >= level) return { reason: "no-points" }
	if (pointLevel === 1 && rules.firstPoint && slot !== rules.firstPoint) {
		return { reason: "first-point", ability: rules.firstPoint }
	}
	if (rule.requires && !rule.requires.some((required) => ranks[required] > 0)) {
		return { reason: "needs-ability", abilities: rule.requires }
	}
	if (rankLevel > level) return { reason: "needs-level", level: rankLevel }
	return { reason: "earlier-point", pointLevel, rankLevel }
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
