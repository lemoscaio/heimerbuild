// Garen: Decisive Strike is an empowered attack that resets the attack timer; its movement speed
// and silence are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const GAREN_HIT_RULES = [
	{
		// `TotalDamage` is the whole attack (wiki: 30 to 150 + 50% AD bonus).
		championKey: "Garen",
		slot: "Q",
		empowersAttack: { includesAttack: true, resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Garen/Decisive_Strike`,
	},
] satisfies readonly AbilityHitRule[]
