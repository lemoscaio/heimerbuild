// Jinx: Fishbones adds attack range and keeps only 90% of her bonus attack speed.
// Pow-Pow's Rev'd up stacks up to 3 times on hit. Super Mega Death Rocket lands near or far.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const JINX_EFFECTS = [
	{
		// Fishbones keeps 90% of Jinx's bonus attack speed (wiki; not in the tooltip).
		id: "jinx-q-rockets",
		source: { kind: "ability", championKey: "Jinx", slot: "Q" },
		form: "rockets",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Rocket Bonus Range" },
			},
			{ kind: "attackSpeedMultiplier", of: "bonus", amount: -0.1 },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
	{
		// The tooltip line is the 3 stacks' bonus attack speed; each lasts 2.5 s (wiki).
		id: "jinx-q-revd-up",
		source: { kind: "ability", championKey: "Jinx", slot: "Q" },
		form: "minigun",
		label: "Rev'd up",
		trigger: { kind: "on-hit" },
		duration: 2.5,
		stacks: { max: 3 },
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Minigun Total Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
] satisfies readonly Effect[]

export const JINX_HIT_RULES = [
	{
		// 10% to 100% of its damage over the first 1500 units; the missing health part doesn't scale.
		championKey: "Jinx",
		slot: "R",
		variants: [
			{ id: "far", label: "Far", damage: ["DamageMax", "PercentDamage"] },
			{ id: "near", label: "Near", damage: ["DamageFloor", "PercentDamage"] },
		],
		since: "16.19",
		sourceUrl: `${WIKI}Jinx/Super_Mega_Death_Rocket!`,
	},
] satisfies readonly AbilityHitRule[]
