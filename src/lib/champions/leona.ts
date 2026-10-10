// Leona: Shield of Daybreak is an empowered attack that resets the attack timer and, unlike other
// empowered attacks, doesn't put her attack on cooldown; its stun and bonus range are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const LEONA_HIT_RULES = [
	{
		// `TotalDamageTooltip` is the bonus magic damage (wiki: 10 to 110 + 30% AP). The wiki tags it
		// "spell", crits apart from the bonus: a spell instance of its own, like Phase Dive.
		championKey: "Leona",
		slot: "Q",
		empowersAttack: { resetsAttack: true, noAttackCooldown: true },
		since: "16.19",
		sourceUrl: `${WIKI}Leona/Shield_of_Daybreak`,
	},
] satisfies readonly AbilityHitRule[]
