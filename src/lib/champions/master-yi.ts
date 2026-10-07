// Master Yi: Highlander's speeds last 7 s; a takedown extends them (not modeled).
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const MASTER_YI_EFFECTS = [
	{
		id: "master-yi-r-active",
		source: { kind: "ability", championKey: "MasterYi", slot: "R" },
		trigger: { kind: "after-use" },
		duration: 7,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Master_Yi/Highlander`,
	},
] satisfies readonly Effect[]
