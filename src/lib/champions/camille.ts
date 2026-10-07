// Camille: Hookshot's second part, Wall Dive, grants its attack speed for 5 s after the dash.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const CAMILLE_EFFECTS = [
	{
		id: "camille-e-active",
		source: { kind: "ability", championKey: "Camille", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 5,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Camille/Wall_Dive`,
	},
] satisfies readonly Effect[]
