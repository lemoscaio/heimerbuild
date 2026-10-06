// Jayce: Hammer Stance adds armor and magic resist by champion level (5 to 26), plus 7.5% of his bonus AD.
import type { Amount, Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** Hammer Stance armor and magic resist: 5 to 26 at levels 1, 6, 11 and 16 (wiki), plus 7.5% bonus AD. */
const HAMMER_RESIST_STEPS: Amount = {
	by: "championLevel",
	steps: [
		{ from: 1, value: 5 },
		{ from: 6, value: 12 },
		{ from: 11, value: 19 },
		{ from: 16, value: 26 },
	],
}
const HAMMER_RESIST_FROM_AD: Amount = {
	by: "stat",
	stat: "attackDamage",
	part: "bonus",
	ratio: 0.075,
}

export const JAYCE_EFFECTS = [
	{
		id: "jayce-hammer-stance",
		source: { kind: "ability", championKey: "Jayce", slot: "R" },
		form: "hammer",
		trigger: { kind: "always" },
		grants: [
			{ kind: "stat", stat: "armor", amount: HAMMER_RESIST_STEPS },
			{ kind: "stat", stat: "magicResist", amount: HAMMER_RESIST_STEPS },
			{ kind: "stat", stat: "armor", amount: HAMMER_RESIST_FROM_AD },
			{ kind: "stat", stat: "magicResist", amount: HAMMER_RESIST_FROM_AD },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jayce/Transform_Mercury_Hammer`,
	},
] satisfies readonly Effect[]
