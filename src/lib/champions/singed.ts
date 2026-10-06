// Singed: a Poison Trail cast is one pass through the trail, a 2 s poison ticking every 0.25 s.
// Fling deals its base plus a share of the target's maximum health.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const SINGED_EFFECTS = [
	{
		// A cast is one pass through the trail: 2 s of poison, a tick every 0.25 s from the first contact.
		id: "singed-q",
		source: { kind: "ability", championKey: "Singed", slot: "Q" },
		trigger: { kind: "after-use" },
		holder: "target",
		duration: 2,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "Q",
					name: "DamagePerSecond",
					scale: 1 / 4,
				},
				every: 0.25,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Singed/Poison_Trail`,
	},
] satisfies readonly Effect[]

export const SINGED_HIT_RULES = [
	{
		// The poison is the `singed-q` effect's damage over time.
		championKey: "Singed",
		slot: "Q",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Singed/Poison_Trail`,
	},
	{
		championKey: "Singed",
		slot: "E",
		damage: ["BaseDamage", "MaxHPDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Singed/Fling`,
	},
] satisfies readonly AbilityHitRule[]
