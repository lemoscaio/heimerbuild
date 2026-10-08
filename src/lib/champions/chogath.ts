// Cho'Gath: Feast's stacks give bonus health and attack range by R rank (the build's match stacks),
// the range capped at 75. The size and Feast's cast range are left out.
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** One per unit Feast kills, only 6 from minions and non-epic monsters (wiki), otherwise uncapped. */
export const FEAST_STACKS = {
	id: "feast-stacks",
	name: "Feast stacks",
	// The wiki gives no typical count; champion kills are the rest.
	sliderMax: 30,
} as const satisfies MatchStackSource

export const CHOGATH_EFFECTS = [
	{
		// Wiki: bonus health 80 to 160 and bonus attack range 4.7 to 7.7 per stack, "capping at 75
		// bonus attack range". The synced R lines carry both per rank.
		id: "chogath-r-stacks",
		source: { kind: "ability", championKey: "Chogath", slot: "R" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: {
					by: "matchStacks",
					source: FEAST_STACKS,
					ratio: { by: "rankValue", label: "Health per Stack" },
				},
			},
			{
				kind: "stat",
				stat: "attackRange",
				amount: {
					by: "matchStacks",
					source: FEAST_STACKS,
					ratio: { by: "rankValue", label: "Attack Range per Stack" },
					max: 75,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Cho%27Gath/Feast`,
	},
] satisfies readonly Effect[]
