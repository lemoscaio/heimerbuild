// Malphite: Thunderclap's passive adds a share of his armor as armor, always on.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const MALPHITE_EFFECTS = [
	{
		id: "malphite-w-passive",
		source: { kind: "ability", championKey: "Malphite", slot: "W" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "armor",
				amount: { by: "stat", stat: "armor", ratio: percentLine("Armor") },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Malphite/Thunderclap`,
	},
] satisfies readonly Effect[]
