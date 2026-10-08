// Sion: Soul Furnace's passive bonus health, which the build sets as the health itself (the build's
// match stacks): 4 per kill, 15 per large unit or champion takedown, so no kill count gives it.
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** Gained only once Soul Furnace has a point (wiki), uncapped. */
export const SOUL_FURNACE_HEALTH = {
	id: "sion-health",
	name: "Soul Furnace bonus health",
	// The wiki gives no typical amount; long games pass 1000.
	sliderMax: 1500,
} as const satisfies MatchStackSource

export const SION_EFFECTS = [
	{
		// Wiki: "Sion gains 4 bonus health whenever he kills an enemy, increased to 15 for large
		// enemies and takedowns against enemy champions."
		id: "sion-w-health",
		source: { kind: "ability", championKey: "Sion", slot: "W" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "matchStacks", source: SOUL_FURNACE_HEALTH },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Sion/Soul_Furnace`,
	},
] satisfies readonly Effect[]
