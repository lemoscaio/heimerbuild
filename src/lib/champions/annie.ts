// Annie: Molten Shield deals no damage in the combo: it hits enemies that attack her.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const ANNIE_HIT_RULES = [
	{
		// Molten Shield's damage hits enemies that attack Annie; the target doesn't attack yet.
		championKey: "Annie",
		slot: "E",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Annie/Molten_Shield`,
	},
] satisfies readonly AbilityHitRule[]
