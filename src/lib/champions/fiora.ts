// Fiora: Bladework's attack speed holds for her next two attacks within 4 s; the second one's
// critical strike is left out (the combo has no critical strikes).
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const FIORA_EFFECTS = [
	{
		id: "fiora-e-active",
		source: { kind: "ability", championKey: "Fiora", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 4,
		charges: 2,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Fiora/Bladework`,
	},
] satisfies readonly Effect[]
