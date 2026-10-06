// Dr. Mundo: Blunt Force Trauma's passive turns a share of his health into attack damage, always on.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const DR_MUNDO_EFFECTS = [
	{
		id: "dr-mundo-e-passive",
		source: { kind: "ability", championKey: "DrMundo", slot: "E" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: {
					by: "stat",
					stat: "health",
					ratio: percentLine("Health Into Attack Damage"),
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Dr._Mundo/Blunt_Force_Trauma`,
	},
] satisfies readonly Effect[]
