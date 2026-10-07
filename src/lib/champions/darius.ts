// Darius: Decimate lands with the outer blade or the inner handle, which deals 35% of the blade's
// damage. Crippling Strike is an empowered attack that resets the attack timer.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const DARIUS_HIT_RULES = [
	{
		// The handle (inner radius) deals 35% of the blade's damage.
		championKey: "Darius",
		slot: "Q",
		variants: [
			{ id: "blade", label: "Outer blade", damage: "BladeDamage" },
			{ id: "handle", label: "Inner handle", damage: "HandleDamage" },
		],
		since: "16.19",
		sourceUrl: `${WIKI}Darius/Decimate`,
	},
	{
		// `EmpoweredAttackDamage` is the whole attack (wiki: 40 to 60% AD bonus).
		championKey: "Darius",
		slot: "W",
		empowersAttack: { includesAttack: true, resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Darius/Crippling_Strike`,
	},
] satisfies readonly AbilityHitRule[]
