// Bel'Veth: True Form adds health (a base by R rank, plus 150% of her bonus AD and of her AP),
// attack range and total attack speed.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const BELVETH_EFFECTS = [
	{
		// The 150% bonus AD and AP health ratios are the wiki's; the tooltip has the base only.
		id: "belveth-r-true-form",
		source: { kind: "ability", championKey: "Belveth", slot: "R" },
		form: "true-form",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "rankValue", label: "Bonus Health" },
			},
			{
				kind: "stat",
				stat: "health",
				amount: {
					by: "stat",
					stat: "attackDamage",
					part: "bonus",
					ratio: 1.5,
				},
			},
			{
				kind: "stat",
				stat: "health",
				amount: { by: "stat", stat: "abilityPower", ratio: 1.5 },
			},
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Range" },
			},
			{
				kind: "attackSpeedMultiplier",
				of: "total",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Bel%27Veth/Endless_Banquet`,
	},
] satisfies readonly Effect[]
