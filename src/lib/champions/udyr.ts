// Udyr: his stance buffs add up: "Switching Stances will not cause any additional effects granted by
// the previous one to end prematurely" (wiki, Udyr). Awaken's level-scaled extras are left out.
// Monk Training: each cast gives his next two attacks within 4 s 30% attack speed.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const UDYR_EFFECTS = [
	{
		id: "udyr-monk-training",
		source: { kind: "ability", championKey: "Udyr", slot: "passive" },
		trigger: { kind: "after-ability" },
		label: "Monk Training",
		duration: 4,
		charges: 2,
		grants: [{ kind: "stat", stat: "attackSpeedPercent", amount: 0.3 }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Udyr/Bridge_Between`,
	},
	{
		id: "udyr-q-active",
		source: { kind: "ability", championKey: "Udyr", slot: "Q" },
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
		sourceUrl: `${WIKI}Udyr/Wilding_Claw`,
	},
	{
		// The life steal holds for the next two attacks; the shield ratios are the wiki's.
		id: "udyr-w-active",
		source: { kind: "ability", championKey: "Udyr", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{ kind: "shield", amount: { by: "rankValue", label: "Shield Amount" } },
			{
				kind: "shield",
				amount: { by: "stat", stat: "attackDamage", part: "bonus", ratio: 0.5 },
			},
			{
				kind: "shield",
				amount: { by: "stat", stat: "abilityPower", ratio: 0.4 },
			},
			{
				kind: "shield",
				amount: {
					by: "stat",
					stat: "health",
					ratio: percentLine("% Health Shield"),
				},
			},
			{
				kind: "stat",
				stat: "lifeStealPercent",
				amount: percentLine("Life Steal"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Udyr/Iron_Mantle`,
	},
	{
		// Its peak: the speed decays to 30% over the last 1.5 s.
		id: "udyr-e-active",
		source: { kind: "ability", championKey: "Udyr", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				// 5% per 100 bonus AD.
				amount: {
					by: "stat",
					stat: "attackDamage",
					part: "bonus",
					ratio: 0.0005,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Udyr/Blazing_Stampede`,
	},
] satisfies readonly Effect[]
