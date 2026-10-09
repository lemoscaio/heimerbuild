import { ABILITY_SLOTS, type AbilitySlot } from "@schemas/champion"
import type { AbilityRanks } from "../stats/rank-stats"
import type { Amount, BuildEffect, Effect, TableAmount } from "./effect"

/** The table amounts an amount reads: itself, or its ratio, max, step or values by attack type. */
function tableAmounts(amount: Amount): TableAmount[] {
	if (typeof amount === "number") return [amount]
	switch (amount.by) {
		case "stat":
		case "percentOfTotal":
			return tableAmounts(amount.ratio)
		case "missingHealth":
			return [amount.max]
		case "gameTime":
			return [amount.step]
		case "matchStacks":
			return amount.ratio === undefined ? [] : tableAmounts(amount.ratio)
		case "statDecay":
			return []
		case "attackType":
			return [amount.melee, amount.ranged]
		default:
			return [amount]
	}
}

/** The other abilities whose rank an effect's amounts read (`rankValue` with a `slot`): GNAR! for Hyper. */
export function boostSlots({
	source,
	grants,
	duration,
	cooldown,
}: Effect): AbilitySlot[] {
	const amounts = [
		...grants.flatMap((grant) => ("amount" in grant ? [grant.amount] : [])),
		...(duration === undefined ? [] : [duration]),
		...(cooldown === undefined ? [] : [cooldown]),
	]
	const own = source.kind === "ability" ? source.slot : undefined
	const slots = amounts
		.flatMap(tableAmounts)
		.flatMap((amount) =>
			typeof amount === "object" &&
			amount.by === "rankValue" &&
			amount.slot &&
			amount.slot !== own
				? [amount.slot]
				: [],
		)
	return ABILITY_SLOTS.filter((slot) => slots.includes(slot))
}

/** An ability with a point that raises an effect's value: "boosted by GNAR! (R2)". */
export type Boost = { name: string; slot: AbilitySlot; rank: number }

/** The boosting abilities that have a point at `ranks`; without one, the effect holds its `unranked` value. */
export function effectBoosts(
	{ boosts }: BuildEffect,
	ranks: AbilityRanks | undefined,
): Boost[] {
	return ABILITY_SLOTS.flatMap((slot) => {
		const ability = boosts?.[slot]
		const rank = ranks?.[slot] ?? 0
		return ability && rank > 0 ? [{ name: ability.name, slot, rank }] : []
	})
}
