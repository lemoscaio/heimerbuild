// Nautilus: Titan's Wrath isn't simulated: its damage comes through his next basic attacks.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import { WIKI } from "./rule-helpers"

export const NAUTILUS_HIT_RULES = [
	{
		championKey: "Nautilus",
		slot: "W",
		notModeled:
			"Titan's Wrath deals its damage through the next basic attacks, which the combo doesn't simulate yet",
		since: "16.19",
		sourceUrl: `${WIKI}Nautilus/Titan's_Wrath`,
	},
] satisfies readonly AbilityHitRule[]
