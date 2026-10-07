// Draven: Blood Rush's attack speed lasts 3 s; its movement speed decays to nothing over 1.5 s.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const DRAVEN_EFFECTS = [
	{
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
				duration: 1.5,
				decay: {},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Draven/Blood_Rush`,
	},
] satisfies readonly Effect[]
