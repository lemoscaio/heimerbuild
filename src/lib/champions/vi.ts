// Vi: every third hit consumes Denting Blows and grants its attack speed for 4 s.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const VI_EFFECTS = [
	{
		// Later hits keep it at 3 stacks, so it holds while she keeps attacking (the next proc refreshes it).
		id: "vi-w-passive",
		source: { kind: "ability", championKey: "Vi", slot: "W" },
		trigger: { kind: "on-hit" },
		stacks: { max: 3, onlyAtMax: true },
		duration: 4,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Vi/Denting_Blows`,
	},
] satisfies readonly Effect[]
