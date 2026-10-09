// Vayne: Tumble (Q) and Final Hour (R) are instant; the game files give 0.25 s and 0.4043 s.
// Final Hour's `BonusAttackDamage` is its bonus AD, not a damage (app effect `vayne-r`).

import { defineAbilityFixes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const VAYNE_ABILITIES = defineAbilityFixes({
	id: "vayne-abilities",
	championKey: "Vayne",
	since: "16.19",
	reason:
		"Tumble and Final Hour have no cast time (the game files give 0.25 s and 0.4043 s); Final Hour deals no damage, its BonusAttackDamage is the bonus AD it grants",
	source: `${WIKI_DATA}Vayne/Final_Hour`,
	castTimes: { Q: 0, R: 0 },
	damage: {
		R: (damage) => damage.filter(({ name }) => name !== "BonusAttackDamage"),
	},
})
