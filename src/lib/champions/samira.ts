// Samira: Wild Rush's attack speed lasts 5 s from the start of the dash.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const SAMIRA_EFFECTS = [
	{
		id: "samira-e-active",
		source: { kind: "ability", championKey: "Samira", slot: "E" },
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
		sourceUrl: `${WIKI}Samira/Wild_Rush`,
	},
] satisfies readonly Effect[]
