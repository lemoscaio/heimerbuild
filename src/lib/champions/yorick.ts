// Yorick: Last Rites is an empowered attack that resets the attack timer; its heal is left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const YORICK_HIT_RULES = [
	{
		// The wiki tags it "spell", like Phase Dive's bonus: a spell instance of its own.
		championKey: "Yorick",
		slot: "Q",
		empowersAttack: { resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Yorick/Last_Rites`,
	},
] satisfies readonly AbilityHitRule[]
