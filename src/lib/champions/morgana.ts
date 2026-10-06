// Morgana: Tormented Shadow ticks every 0.5 s for 5 s, up to twice as much as the target's missing health grows.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const MORGANA_EFFECTS = [
	{
		// A tick at the cast and every 0.5 s for 5 s, up to twice as much as the target's missing health grows.
		id: "morgana-w",
		source: { kind: "ability", championKey: "Morgana", slot: "W" },
		trigger: { kind: "after-use" },
		holder: "target",
		duration: 5,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "W",
					name: "TotalMinDamage",
					scale: 1 / 2,
				},
				every: 0.5,
				missingHealthBonus: 1,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Morgana/Tormented_Shadow`,
	},
] satisfies readonly Effect[]

export const MORGANA_HIT_RULES = [
	{
		// Its ticks are the `morgana-w` effect's damage over time.
		championKey: "Morgana",
		slot: "W",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Morgana/Tormented_Shadow`,
	},
] satisfies readonly AbilityHitRule[]
