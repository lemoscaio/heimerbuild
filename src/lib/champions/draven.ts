// Draven: Blood Rush's attack speed lasts 3 s, its movement speed 1.5 s (one row, its peak).
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const DRAVEN_EFFECTS = [
	{
		// The movement speed decays over its 1.5 s: its peak, for the attack speed's 3 s.
		id: "draven-w-active",
		source: { kind: "ability", championKey: "Draven", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 3,
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
		sourceUrl: `${WIKI}Draven/Blood_Rush`,
	},
] satisfies readonly Effect[]
