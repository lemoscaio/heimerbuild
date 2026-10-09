// Ahri: Fox-Fire (W) is instant; the game files give 0.25 s. Orb of Deception deals its damage
// twice, magic on the way out and true on the way back: the sync adds the return as `ReturnDamage`.

import { defineAbilityFixes } from "../overrides/define-champion-overrides"
import type { AbilityDamage } from "../schemas/champion"
import { WIKI_DATA } from "./rule-helpers"

/** The orb's return: "the same amount in true damage" (wiki), one formula the game files lack. */
function withReturnDamage(damage: AbilityDamage[]): AbilityDamage[] {
	const out = damage.find(({ name }) => name === "TotalDamage")
	if (!out || damage.some(({ name }) => name === "ReturnDamage")) return damage
	return [...damage, { ...out, name: "ReturnDamage", type: "true" }]
}

export const AHRI_ABILITIES = defineAbilityFixes({
	id: "ahri-abilities",
	championKey: "Ahri",
	since: "16.19",
	reason:
		"Fox-Fire has no cast time (the game files give 0.25 s); Orb of Deception's return deals the same damage as true damage, which the game files don't list",
	source: `${WIKI_DATA}Ahri/Orb_of_Deception`,
	castTimes: { W: 0 },
	damage: { Q: withReturnDamage },
})
