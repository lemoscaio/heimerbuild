// Ahri: Orb of Deception hits a lone target twice, magic out and true back (travel not counted).
// Fox-Fire's three flames hit it, the second and third for 40%. Spirit Rush can be recast twice
// within 15 s, 1 s apart, one bolt each. The movement speed, Charm and Essence Theft's heals are
// left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const AHRI_HIT_RULES = [
	{
		// `ReturnDamage` is the sync's true-damage copy of `TotalDamage` (ahri-abilities).
		championKey: "Ahri",
		slot: "Q",
		damage: ["TotalDamage", "ReturnDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Ahri/Orb_of_Deception`,
	},
	{
		// "Each flame deals magic damage, with subsequent flames against a target dealing 40% damage."
		championKey: "Ahri",
		slot: "W",
		damage: ["SingleFireDamage", "MultiFireDamage", "MultiFireDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Ahri/Fox-Fire`,
	},
	{
		// "Can be recast twice more within 15 seconds ... with a 1-second static cooldown between casts."
		championKey: "Ahri",
		slot: "R",
		recasts: { count: 2, within: 15, every: 1 },
		since: "16.19",
		sourceUrl: `${WIKI}Ahri/Spirit_Rush`,
	},
] satisfies readonly AbilityHitRule[]
