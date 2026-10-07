// Sivir: Ricochet's attack speed lasts 4 s; its bounces hit other targets, so the combo has none.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const SIVIR_EFFECTS = [
	{
		id: "sivir-w-active",
		source: { kind: "ability", championKey: "Sivir", slot: "W" },
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
		sourceUrl: `${WIKI}Sivir/Ricochet`,
	},
] satisfies readonly Effect[]
