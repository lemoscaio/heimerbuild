import type { Amount, Effect } from "./effect"

/** The current health condition, in percent of maximum health; absent means full. */
export const FULL_HEALTH = 100
export const MIN_HEALTH = 1

function readsHealth(amount: Amount): boolean {
	if (typeof amount !== "object") return false
	return (
		amount.by === "missingHealth" ||
		(amount.by === "stat" && readsHealth(amount.ratio))
	)
}

/** Whether the effect's value depends on the current health (Tryndamere's Bloodlust). */
export function usesCurrentHealth({ grants }: Effect): boolean {
	return grants.some((grant) => "amount" in grant && readsHealth(grant.amount))
}
