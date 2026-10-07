// Olaf: Tough It Out's attack speed lasts 5 s and its shield 2.5 s (one row); the shield grows
// with his missing health.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const OLAF_EFFECTS = [
	{
		id: "olaf-w-active",
		source: { kind: "ability", championKey: "Olaf", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 5,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
			{ kind: "shield", amount: { by: "rankValue", label: "Base Shield" } },
			{
				kind: "shield",
				// 17.5% of missing health, counted up to 70% missing (wiki).
				amount: {
					by: "stat",
					stat: "health",
					ratio: { by: "missingHealth", max: 0.175 * 0.7, fullAt: 70 },
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Olaf/Tough_It_Out`,
	},
] satisfies readonly Effect[]
