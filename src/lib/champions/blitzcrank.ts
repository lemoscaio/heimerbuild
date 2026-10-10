// Blitzcrank: Overdrive lasts 5 s; its movement speed decays to 10% over the first 2.9 s. Power
// Fist is an empowered attack that resets the attack timer.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const BLITZCRANK_EFFECTS = [
	{
		// The 30% self-slow when it ends is left out.
		id: "blitzcrank-w-active",
		source: { kind: "ability", championKey: "Blitzcrank", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 5,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
				decay: { over: 2.9, to: 0.1 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Blitzcrank/Overdrive`,
	},
] satisfies readonly Effect[]

export const BLITZCRANK_HIT_RULES = [
	{
		// `TotalDamage` is the whole attack (wiki: 100% AD + 25% AP bonus). Wiki: spell damage too,
		// "This includes the basic attack itself."
		championKey: "Blitzcrank",
		slot: "E",
		empowersAttack: {
			includesAttack: true,
			resetsAttack: true,
			spellAttack: true,
		},
		since: "16.19",
		sourceUrl: `${WIKI}Blitzcrank/Power_Fist`,
	},
] satisfies readonly AbilityHitRule[]
