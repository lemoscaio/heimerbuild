// Miss Fortune: Strut's active attack speed lasts 4 s. Its passive movement speed (after 4 s and
// 7 s without taking damage) needs a condition the effects lack, so it is left out.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const MISS_FORTUNE_EFFECTS = [
	{
		id: "miss-fortune-w-active",
		source: { kind: "ability", championKey: "MissFortune", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Miss_Fortune/Strut`,
	},
] satisfies readonly Effect[]
