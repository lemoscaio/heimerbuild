// Shyvana: Dragon Form adds bonus health and attack range by R rank.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const SHYVANA_EFFECTS = [
	{
		id: "shyvana-r-dragon-form",
		source: { kind: "ability", championKey: "Shyvana", slot: "R" },
		form: "dragon",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "rankValue", label: "Bonus Health" },
			},
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Attack Range" },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Shyvana/Dragon%27s_Descent`,
	},
] satisfies readonly Effect[]
