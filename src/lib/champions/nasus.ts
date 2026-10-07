// Nasus: Siphoning Strike is an empowered attack that resets the attack timer; its stacks are not
// modeled, so it deals its base bonus.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const NASUS_HIT_RULES = [
	{
		// `TotalDamage` is the attack plus the bonus; its stacks are the unread part.
		championKey: "Nasus",
		slot: "Q",
		empowersAttack: { includesAttack: true, resetsAttack: true },
		unreadAsZero: "no Siphoning Strike stacks",
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Siphoning_Strike`,
	},
] satisfies readonly AbilityHitRule[]
