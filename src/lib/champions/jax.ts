// Jax: Empower is an empowered attack that resets the attack timer; empowering Leap Strike
// instead is left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const JAX_HIT_RULES = [
	{
		championKey: "Jax",
		slot: "W",
		empowersAttack: { resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Jax/Empower`,
	},
] satisfies readonly AbilityHitRule[]
