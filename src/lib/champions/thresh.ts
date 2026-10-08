// Thresh: Damnation's souls give 1 ability power and 1 bonus armor each (the build's match stacks).
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** Dropped by champions and large units that die near him, 2 by epic monsters (wiki), uncapped. */
export const DAMNATION_SOULS = {
	id: "thresh-souls",
	name: "Damnation souls",
	// The wiki gives no typical count; long games pass 150.
	sliderMax: 300,
} as const satisfies MatchStackSource

export const THRESH_EFFECTS = [
	{
		// Wiki: "For each stack, Thresh gains 1 ability power and 1 bonus armor."
		id: "thresh-passive",
		source: { kind: "ability", championKey: "Thresh", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: DAMNATION_SOULS },
			},
			{
				kind: "stat",
				stat: "armor",
				amount: { by: "matchStacks", source: DAMNATION_SOULS },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Thresh/Damnation`,
	},
] satisfies readonly Effect[]
