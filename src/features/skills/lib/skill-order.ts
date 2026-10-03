import { ABILITY_SLOTS, type AbilitySlot } from "@schemas/champion"
import { UNSPENT_LEVEL_MARK } from "@/lib/skill-order-param"
import { MAX_LEVEL } from "@/lib/stats/growth"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type { SkillRules } from "./skill-rules"

/** The point of each level, level 1 first: an ability, or null while that level's point is unspent. */
export type SkillOrder = readonly (AbilitySlot | null)[]

/** `order` without its trailing unspent levels. */
export function trimOrder(order: SkillOrder): SkillOrder {
	let end = order.length
	while (end > 0 && order[end - 1] === null) end--
	return end === order.length ? order : order.slice(0, end)
}

/** `order` with `slot` as the point of `level`, the levels between left unspent. */
export function withPointAt(
	order: SkillOrder,
	{ slot, level }: { slot: AbilitySlot; level: number },
): SkillOrder {
	const next = Array.from(
		{ length: Math.max(order.length, level) },
		(_, index) => order[index] ?? null,
	)
	next[level - 1] = slot
	return trimOrder(next)
}

/** Each ability's rank after `order`: its innate ranks plus its points. */
export function ranksOf(order: SkillOrder, rules: SkillRules): AbilityRanks {
	const ranks = {
		Q: rules.abilities.Q.innateRanks,
		W: rules.abilities.W.innateRanks,
		E: rules.abilities.E.innateRanks,
		R: rules.abilities.R.innateRanks,
	}
	for (const slot of order) if (slot) ranks[slot]++
	return ranks
}

/** Whether the point gained at `level` may go to `slot`, with the abilities at `ranks`. */
export function canRankUp(
	rules: SkillRules,
	ranks: AbilityRanks,
	{ slot, level }: { slot: AbilitySlot; level: number },
): boolean {
	if (!rules.hasSkillOrder || level > MAX_LEVEL) return false
	if (level === 1 && rules.firstPoint && slot !== rules.firstPoint) return false
	const rule = rules.abilities[slot]
	const rank = ranks[slot]
	return (
		rank < rule.maxRank &&
		(rule.rankLevels[rank] ?? Number.POSITIVE_INFINITY) <= level &&
		(!rule.requires || rule.requires.some((required) => ranks[required] > 0))
	)
}

/** The level of the first point the rules reject, each checked at its own level; undefined when all are valid. */
export function firstInvalidLevel(
	order: SkillOrder,
	rules: SkillRules,
): number | undefined {
	const index = order.findIndex(
		(slot, index) =>
			!!slot &&
			!canRankUp(rules, ranksOf(order.slice(0, index), rules), {
				slot,
				level: index + 1,
			}),
	)
	return index === -1 ? undefined : index + 1
}

/** The longest start of `order` the rules allow: a link's invalid points are dropped. */
export function validPrefix(order: SkillOrder, rules: SkillRules): SkillOrder {
	const invalidLevel = firstInvalidLevel(order, rules)
	return trimOrder(
		invalidLevel === undefined ? order : order.slice(0, invalidLevel - 1),
	)
}

export function isValidOrder(order: SkillOrder, rules: SkillRules): boolean {
	return firstInvalidLevel(order, rules) === undefined
}

/**
 * The ability the recommended order suggests for the unspent point of `level` in `order`: Riot's
 * first points, then its max priority, skipping any the rules forbid there. Only a hint until spent.
 */
export function suggestedPoint(
	order: SkillOrder,
	{ level, rules }: { level: number; rules: SkillRules },
): AbilitySlot | undefined {
	const candidates = [
		rules.recommended.firstPoints[level - 1],
		...rules.recommended.priority,
		...ABILITY_SLOTS,
	]
	return candidates.find(
		(slot) =>
			slot !== undefined &&
			isValidOrder(withPointAt(order, { slot, level }), rules),
	)
}

/** `order` with every unspent level up to `level` spent as the recommended order says, level 1 first. */
export function withRecommended(
	order: SkillOrder,
	{ level, rules }: { level: number; rules: SkillRules },
): SkillOrder {
	let filled = order
	for (let pointLevel = 1; pointLevel <= level; pointLevel++) {
		if (filled[pointLevel - 1]) continue
		const slot = suggestedPoint(filled, { level: pointLevel, rules })
		if (slot) filled = withPointAt(filled, { slot, level: pointLevel })
	}
	return filled
}

/** `order` as the `skills` URL value ("Q_QW"); undefined when nothing is spent. */
export function serializeOrder(order: SkillOrder): string | undefined {
	const trimmed = trimOrder(order)
	return trimmed.length
		? trimmed.map((slot) => slot ?? UNSPENT_LEVEL_MARK).join("")
		: undefined
}

/** The `skills` URL value as an order the rules allow; invalid points and what follows them are dropped. */
export function parseOrder(
	value: string | undefined,
	rules: SkillRules,
): SkillOrder {
	const slots: (AbilitySlot | null)[] = []
	for (const letter of (value ?? "").slice(0, MAX_LEVEL)) {
		if (letter === UNSPENT_LEVEL_MARK) slots.push(null)
		else if (ABILITY_SLOTS.includes(letter as AbilitySlot)) {
			slots.push(letter as AbilitySlot)
		} else break
	}
	return validPrefix(slots, rules)
}
