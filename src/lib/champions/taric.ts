// Taric: Bastion's passive adds a share of his armor as armor, always on.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const TARIC_EFFECTS = [
	{
		id: "taric-w-passive",
		source: { kind: "ability", championKey: "Taric", slot: "W" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "armor",
				amount: {
					by: "stat",
					stat: "armor",
					ratio: percentLine("Passive Armor"),
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Taric/Bastion`,
	},
] satisfies readonly Effect[]
