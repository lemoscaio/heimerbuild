// Tryndamere: Bloodlust's bonus AD grows with his missing health, at its most from 90% missing.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const TRYNDAMERE_EFFECTS = [
	{
		// Riot's tooltip calls the most bonus AD "Maximum Damage".
		id: "tryndamere-q-passive",
		source: { kind: "ability", championKey: "Tryndamere", slot: "Q" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: {
					by: "missingHealth",
					max: { by: "rankValue", label: "Maximum Damage" },
					fullAt: 90,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Tryndamere/Bloodlust`,
	},
] satisfies readonly Effect[]
