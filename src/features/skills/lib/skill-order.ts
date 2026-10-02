import { ABILITY_SLOTS, type AbilitySlot } from "@schemas/champion"
import { MAX_LEVEL } from "@/lib/stats/growth"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type { SkillRules } from "./skill-rules"

/** One ability per level, level 1 first. */
export type SkillOrder = readonly AbilitySlot[]

/** Each ability's rank after `order`: its innate ranks plus its points. */
export function ranksOf(order: SkillOrder, rules: SkillRules): AbilityRanks {
	const ranks = {
		Q: rules.abilities.Q.innateRanks,
		W: rules.abilities.W.innateRanks,
		E: rules.abilities.E.innateRanks,
		R: rules.abilities.R.innateRanks,
	}
	for (const slot of order) ranks[slot]++
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

/** The longest start of `order` the rules allow: a link's invalid points are dropped. */
export function validPrefix(order: SkillOrder, rules: SkillRules): SkillOrder {
	const valid: AbilitySlot[] = []
	for (const slot of order) {
		const ranks = ranksOf(valid, rules)
		if (!canRankUp(rules, ranks, { slot, level: valid.length + 1 })) break
		valid.push(slot)
	}
	return valid
}

export function isValidOrder(order: SkillOrder, rules: SkillRules): boolean {
	return validPrefix(order, rules).length === order.length
}

/** The point the game would suggest at `level`: the recommended first points, then the max priority. */
function suggestedPoint(
	order: SkillOrder,
	rules: SkillRules,
	level: number,
): AbilitySlot | undefined {
	const ranks = ranksOf(order, rules)
	const candidates = [
		rules.recommended.firstPoints[level - 1],
		...rules.recommended.priority,
		...ABILITY_SLOTS,
	]
	return candidates.find(
		(slot) => slot !== undefined && canRankUp(rules, ranks, { slot, level }),
	)
}

/** `picks` (a valid order) followed by the suggested points up to `level`. */
export function autoFill(
	picks: SkillOrder,
	{ level, rules }: { level: number; rules: SkillRules },
): SkillOrder {
	const order = [...picks.slice(0, level)]
	while (order.length < level) {
		const next = suggestedPoint(order, rules, order.length + 1)
		if (!next) break
		order.push(next)
	}
	return order
}

/** `order` as the `skills` URL value ("EQWE"); undefined when empty. */
export function serializeOrder(order: SkillOrder): string | undefined {
	return order.length ? order.join("") : undefined
}

/** The `skills` URL value as an order the rules allow; invalid points and what follows them are dropped. */
export function parseOrder(
	value: string | undefined,
	rules: SkillRules,
): SkillOrder {
	const slots: AbilitySlot[] = []
	for (const letter of (value ?? "").slice(0, MAX_LEVEL)) {
		if (!ABILITY_SLOTS.includes(letter as AbilitySlot)) break
		slots.push(letter as AbilitySlot)
	}
	return validPrefix(slots, rules)
}
