import type { AbilitySlot } from "@schemas/champion"
import { MAX_LEVEL } from "@/lib/stats/growth"
import {
	firstInvalidLevel,
	isValidOrder,
	ranksOf,
	type SkillOrder,
	suggestedPoint,
	trimOrder,
	withPointAt,
	withRecommended,
} from "./skill-order"
import type { SkillRules } from "./skill-rules"

/**
 * The points the user spent, per level (null: unspent), trimmed. Like browser history it may run
 * past the current level: lowering the level keeps those points, raising it again brings them back.
 * The tail is every point above the current level; any edit at or below it drops the tail.
 */
export type SkillPicks = SkillOrder

type AtLevel = { level: number; rules: SkillRules }

/** What each level 1 to 18 holds: the order strip and the grid columns. */
export type LevelPoint =
	/** A spent point, with the rank it takes its ability to. */
	| { level: number; state: "spent"; slot: AbilitySlot; rank: number }
	/** An unspent point; `suggestion` marks the recommended ability for the first one (never counted). */
	| { level: number; state: "free"; suggestion: AbilitySlot | undefined }
	/** A point kept above the current level, back when the level goes up again. */
	| { level: number; state: "kept"; slot: AbilitySlot }
	| { level: number; state: "future" }

function spentAt(picks: SkillPicks, level: number): SkillOrder {
	return trimOrder(picks.slice(0, level))
}

function freeLevels(picks: SkillPicks, level: number): number[] {
	return Array.from({ length: level }, (_, index) => index + 1).filter(
		(pointLevel) => !picks[pointLevel - 1],
	)
}

/** The recommended ability for the first unspent level that can take one; undefined when none can. */
export function nextSuggestion(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): { level: number; slot: AbilitySlot } | undefined {
	const spent = spentAt(picks, level)
	for (const pointLevel of freeLevels(spent, level)) {
		const slot = suggestedPoint(spent, { level: pointLevel, rules })
		if (slot) return { level: pointLevel, slot }
	}
	return undefined
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
		if (pointLevel > level) {
			return slot
				? { level: pointLevel, state: "kept", slot }
				: { level: pointLevel, state: "future" }
		}
		if (slot) {
			const rank = ranksOf(spent.slice(0, pointLevel), rules)[slot]
			return { level: pointLevel, state: "spent", slot, rank }
		}
		return {
			level: pointLevel,
			state: "free",
			suggestion:
				suggestion?.level === pointLevel ? suggestion.slot : undefined,
		}
	})
}

/**
 * `picks` with the point of `pointLevel` (at most `level`) on `slot`: a spent point changes or an
 * unspent one is spent. Undefined when the rules forbid it. A change drops the tail above `level`,
 * as a new page drops the browser's forward history.
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
	if (picks[pointLevel - 1] === slot) return picks
	const next = withPointAt(spentAt(picks, level), { slot, level: pointLevel })
	return isValidOrder(next, rules) ? next : undefined
}

type AtPointLevel = AtLevel & { pointLevel: number }

/** The spent points up to `level` with the point of `pointLevel` unspent; undefined when it isn't spent. */
function withoutPoint(
	picks: SkillPicks,
	{ pointLevel, level }: Omit<AtPointLevel, "rules">,
): SkillOrder | undefined {
	if (pointLevel < 1 || pointLevel > level || !picks[pointLevel - 1]) {
		return undefined
	}
	const next = [...spentAt(picks, level)]
	next[pointLevel - 1] = null
	return trimOrder(next)
}

/**
 * `picks` with the point of `pointLevel` (at most `level`) removed: that level becomes unspent and
 * no other point moves. Like any change it drops the tail above `level`. Undefined when it would
 * leave a later point invalid, as `placePoint` refuses: see `removeBlocker`.
 */
export function removePoint(
	picks: SkillPicks,
	{ pointLevel, level, rules }: AtPointLevel,
): SkillPicks | undefined {
	const next = withoutPoint(picks, { pointLevel, level })
	return next && isValidOrder(next, rules) ? next : undefined
}

/** The first later point that needs the removed one (Shen's W needs a Q first). */
export type RemoveBlocker = { level: number; slot: AbilitySlot }

/** Why the point of `pointLevel` cannot be removed; undefined when it can (or isn't spent). */
export function removeBlocker(
	picks: SkillPicks,
	{ pointLevel, level, rules }: AtPointLevel,
): RemoveBlocker | undefined {
	const next = withoutPoint(picks, { pointLevel, level })
	const invalidLevel = next && firstInvalidLevel(next, rules)
	const slot = invalidLevel && next[invalidLevel - 1]
	return invalidLevel && slot ? { level: invalidLevel, slot } : undefined
}

/** The earliest unspent level up to `level` that can take one more point in `slot`. */
export function spendLevel(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): number | undefined {
	return freeLevels(picks, level).find(
		(pointLevel) => !!placePoint(picks, { slot, pointLevel, level, rules }),
	)
}

/** `picks` with one more point in `slot`, at its `spendLevel`; the levels it skips stay unspent. */
export function spendPoint(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SkillPicks | undefined {
	const pointLevel = spendLevel(picks, { slot, level, rules })
	return pointLevel === undefined
		? undefined
		: placePoint(picks, { slot, pointLevel, level, rules })
}

/** `picks` with every unspent level up to `level` spent as the recommended order says. */
export function fillRecommended(
	picks: SkillPicks,
	{ level, rules }: AtLevel,
): SkillPicks {
	const spent = spentAt(picks, level)
	const filled = withRecommended(spent, { level, rules })
	return filled.length === spent.length &&
		filled.every((slot, index) => slot === spent[index])
		? picks
		: filled
}

/** Why `slot` cannot take one more point, as the rank-up tooltip explains it. */
export type SpendBlocker =
	| { reason: "max-rank" }
	| { reason: "no-points" }
	| { reason: "first-point"; ability: AbilitySlot }
	| { reason: "needs-ability"; abilities: readonly AbilitySlot[] }
	| { reason: "needs-level"; level: number }
	/** The rank's level is reached, but no unspent level from it on can take the point. */
	| { reason: "no-free-level"; rankLevel: number }

export function spendBlocker(
	picks: SkillPicks,
	{ slot, level, rules }: AtLevel & { slot: AbilitySlot },
): SpendBlocker | undefined {
	if (spendPoint(picks, { slot, level, rules })) return undefined
	const spent = spentAt(picks, level)
	const ranks = ranksOf(spent, rules)
	const rule = rules.abilities[slot]
	const rankLevel = rule.rankLevels[ranks[slot]]
	const free = freeLevels(spent, level)
	if (ranks[slot] >= rule.maxRank || rankLevel === undefined) {
		return { reason: "max-rank" }
	}
	if (!free.length) return { reason: "no-points" }
	if (rankLevel > level) return { reason: "needs-level", level: rankLevel }
	if (rule.requires && !rule.requires.some((required) => ranks[required] > 0)) {
		return { reason: "needs-ability", abilities: rule.requires }
	}
	if (rules.firstPoint && free.length === 1 && free[0] === 1) {
		return { reason: "first-point", ability: rules.firstPoint }
	}
	return { reason: "no-free-level", rankLevel }
}

/**
 * The full picks when `remembered` still agrees with the link, else the link's: `linkPicks` are
 * the picks up to `level`, so a remembered history must hold exactly them up to `level`.
 */
export function withKeptPicks(
	remembered: SkillPicks | undefined,
	linkPicks: SkillPicks,
	level: number,
): SkillPicks {
	const head = remembered && spentAt(remembered, level)
	if (
		!head ||
		head.length !== linkPicks.length ||
		linkPicks.some((slot, index) => head[index] !== slot)
	) {
		return linkPicks
	}
	return remembered
}
