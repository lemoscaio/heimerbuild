// Senna: Absolution's Mist stacks give 0.75 bonus AD each, and 20 attack range and 10% critical
// strike chance per 20 (the build's match stacks). The life steal from critical strike chance past
// 100% is left out.
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** From marked champions and the Mist Wraiths of units that die near her (wiki), uncapped. */
export const MIST_STACKS = {
	id: "senna-mist",
	name: "Mist stacks",
	// The wiki gives no typical count; long games pass 200.
	sliderMax: 400,
} as const satisfies MatchStackSource

export const SENNA_EFFECTS = [
	{
		// Wiki: "For each stack of Mist, Senna gains 0.75 bonus attack damage. For every 20 stacks, she
		// also gains 20 bonus attack range and 10% critical strike chance."
		id: "senna-passive",
		source: { kind: "ability", championKey: "Senna", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: { by: "matchStacks", source: MIST_STACKS, ratio: 0.75 },
			},
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "matchStacks", source: MIST_STACKS, per: 20, ratio: 20 },
			},
			{
				kind: "stat",
				stat: "critChancePercent",
				amount: {
					by: "matchStacks",
					source: MIST_STACKS,
					per: 20,
					ratio: 0.1,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Senna/Absolution`,
	},
] satisfies readonly Effect[]
