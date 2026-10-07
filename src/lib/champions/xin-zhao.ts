// Xin Zhao: Audacious Charge's attack speed lasts 5 s and grows with AP.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const XIN_ZHAO_EFFECTS = [
	{
		// Its "+1% per 5% bonus attack speed from non-buff sources" is left out: the totals hold buffs too.
		id: "xin-zhao-e-active",
		source: { kind: "ability", championKey: "XinZhao", slot: "E" },
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
				stat: "attackSpeedPercent",
				// 10% per 100 AP.
				amount: { by: "stat", stat: "abilityPower", ratio: 0.001 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Xin_Zhao/Audacious_Charge`,
	},
] satisfies readonly Effect[]
