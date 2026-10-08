// Swain: Ravenous Flock's soul fragments give 15 bonus health each (the build's match stacks). The
// heal on pickup is left out.
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** One per enemy champion that dies near him or that Vision of Empire or Nevermove hits (wiki), uncapped. */
export const SOUL_FRAGMENTS = {
	id: "swain-soul-fragments",
	name: "Soul Fragments",
	// The wiki gives no typical count; they come only from champions.
	sliderMax: 100,
} as const satisfies MatchStackSource

export const SWAIN_EFFECTS = [
	{
		// Wiki: "For each stack, Swain gains 15 bonus health permanently."
		id: "swain-passive",
		source: { kind: "ability", championKey: "Swain", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "matchStacks", source: SOUL_FRAGMENTS, ratio: 15 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Swain/Ravenous_Flock`,
	},
] satisfies readonly Effect[]
