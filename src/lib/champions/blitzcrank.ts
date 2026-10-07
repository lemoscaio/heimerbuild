// Blitzcrank: Overdrive's attack speed lasts 5 s; its movement speed decays to 10% over 2.9 s (its peak).
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const BLITZCRANK_EFFECTS = [
	{
		// The 30% self-slow when it ends is left out.
		id: "blitzcrank-w-active",
		source: { kind: "ability", championKey: "Blitzcrank", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 5,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Blitzcrank/Overdrive`,
	},
] satisfies readonly Effect[]
