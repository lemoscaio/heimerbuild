// Tristana: Rapid Fire's attack speed lasts 7 s.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const TRISTANA_EFFECTS = [
	{
		id: "tristana-q-active",
		source: { kind: "ability", championKey: "Tristana", slot: "Q" },
		trigger: { kind: "after-use" },
		duration: 7,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Tristana/Rapid_Fire`,
	},
] satisfies readonly Effect[]
