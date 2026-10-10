/**
 * Upgrades the game swaps in for free once their base item's Manaflow reaches 360 (issue 436). The
 * shop never sells them, so the shop filter would drop them; each is kept, its base checked against
 * Data Dragon's `specialRecipe` and written as `transformsFrom`. Fimbulwinter is out of scope.
 */
export const ITEM_UPGRADES: Readonly<Record<string, string>> = {
	"3042": "3004", // Muramana, from Manamune
	"3040": "3003", // Seraph's Embrace, from Archangel's Staff
}

export type UpgradeMismatch = {
	id: string
	name: string
	expected: string
	actual: number | undefined
}

export function formatUpgradeMismatches(
	mismatches: readonly UpgradeMismatch[],
) {
	return [
		"Item upgrades whose Data Dragon specialRecipe is not the base item in ITEM_UPGRADES:",
		...mismatches.map(
			({ id, name, expected, actual }) =>
				`  ${id} ${name}: expected ${expected}, actual ${actual ?? "none"}`,
		),
		"Fix the base id in ITEM_UPGRADES (scripts/sync-data/item-upgrades.ts), or remove the upgrade.",
	].join("\n")
}
