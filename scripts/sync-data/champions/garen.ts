// Garen: Decisive Strike (Q) and Courage (W) are instant; the game files give 0.52 s and 0.25 s.
// Judgment's "NearestEnemyBonus" is its 25% more damage to the nearest enemy, not a damage: the
// sync gives it the spin's damage × 1.25, what a lone target takes per spin.

import { defineAbilityFixes } from "../overrides/define-champion-overrides"
import type { AbilityDamage } from "../schemas/champion"
import { WIKI_DATA } from "./rule-helpers"

/** Wiki: "Judgment deals 25% increased damage against the nearest enemy hit." */
const NEAREST_ENEMY_FACTOR = 1.25

function nearestEnemyDamage(damage: AbilityDamage[]): AbilityDamage[] {
	const spin = damage.find(({ name }) => name === "TotalDamage")
	return damage.map((formula) =>
		formula.name === "NearestEnemyBonus" && formula.notModeled && spin
			? {
					name: formula.name,
					type: spin.type,
					parts: spin.parts,
					multiplier: NEAREST_ENEMY_FACTOR,
				}
			: formula,
	)
}

export const GAREN_ABILITIES = defineAbilityFixes({
	id: "garen-abilities",
	championKey: "Garen",
	since: "16.19",
	reason:
		"Decisive Strike and Courage have no cast time (the game files give 0.52 s and 0.25 s); Judgment's NearestEnemyBonus is a 25% increase, read as the spin's damage × 1.25",
	source: `${WIKI_DATA}Garen/Judgment`,
	castTimes: { Q: 0, W: 0 },
	damage: { E: nearestEnemyDamage },
})
