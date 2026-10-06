// Veigar: Primordial Burst isn't simulated: it grows with the target's missing health.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const VEIGAR_HIT_RULES = [
	{
		championKey: "Veigar",
		slot: "R",
		notModeled:
			"Primordial Burst grows with the target's missing health, which the formulas don't read yet",
		since: "16.19",
		sourceUrl: `${WIKI}Veigar/Primordial_Burst`,
	},
] satisfies readonly AbilityHitRule[]
