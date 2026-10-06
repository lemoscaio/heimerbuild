// Maokai: Bramble Smash deals its base plus a share of the target's maximum health.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const MAOKAI_HIT_RULES = [
	{
		championKey: "Maokai",
		slot: "Q",
		damage: ["TotalDamage", "BasePercentHealth"],
		since: "16.19",
		sourceUrl: `${WIKI}Maokai/Bramble_Smash`,
	},
] satisfies readonly AbilityHitRule[]
