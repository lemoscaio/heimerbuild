// Zac: Unstable Matter deals its base plus a share of the target's maximum health.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const ZAC_HIT_RULES = [
	{
		championKey: "Zac",
		slot: "W",
		damage: ["BaseDamage", "DisplayPercentDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Zac/Unstable_Matter`,
	},
] satisfies readonly AbilityHitRule[]
