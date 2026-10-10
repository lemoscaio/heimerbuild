import type { Amount, Grant } from "./effect"

/** The amounts a grant reads: its own, a damage's base parts and share of health, a tick's. */
function grantAmounts(grant: Grant): readonly Amount[] {
	const own = "amount" in grant ? [grant.amount] : []
	const base = "base" in grant ? [grant.base ?? []].flat() : []
	const targetHealth =
		"targetHealth" in grant && grant.targetHealth
			? [grant.targetHealth.ratio]
			: []
	const tick =
		grant.kind === "damageOverTime" && grant.tick.by === "amount"
			? [grant.tick.amount]
			: []
	return [...own, ...base, ...targetHealth, ...tick]
}

function readsMana(amount: Amount): boolean {
	return (
		typeof amount === "object" &&
		(amount.by === "stat" || amount.by === "percentOfTotal") &&
		amount.stat === "mana"
	)
}

/** A grant whose value is a share of the champion's mana (Muramana's Awe and Shock). */
export function scalesWithMana(grant: Grant): boolean {
	return grantAmounts(grant).some(readsMana)
}
