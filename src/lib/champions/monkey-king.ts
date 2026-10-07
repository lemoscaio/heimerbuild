// Wukong (MonkeyKing): Nimbus Strike's attack speed lasts 5 s after the dash.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const MONKEY_KING_EFFECTS = [
	{
		id: "monkey-king-e-active",
		source: { kind: "ability", championKey: "MonkeyKing", slot: "E" },
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
		sourceUrl: `${WIKI}Wukong/Nimbus_Strike`,
	},
] satisfies readonly Effect[]
