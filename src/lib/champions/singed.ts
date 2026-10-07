// Singed: Poison Trail poisons for 2 s after the target leaves the trail, ticking every 0.25 s.
// Fling deals its base plus a share of the target's maximum health.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const SINGED_EFFECTS = [
	{
		// One pass: 8 ticks over 2 s, the last at its end (the wiki's minimum). Staying in the trail
		// refreshes it: the Q rule's variants set how long it runs. {@see SINGED_HIT_RULES}
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
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Singed/Poison_Trail`,
	},
] satisfies readonly Effect[]

export const SINGED_HIT_RULES = [
	{
		// The poison is the `singed-q` effect's damage over time: the time in the trail plus its 2 s.
		// The wiki's extra tick on a first contact is left out (PR 377).
		championKey: "Singed",
		slot: "Q",
		damage: null,
		variants: [
			{ id: "0s", label: "0 s", duration: 2 },
			{ id: "2s", label: "2 s", duration: 4 },
			{ id: "4s", label: "4 s", duration: 6 },
		],
		variantsLabel: { text: "In trail", name: "Time in the trail" },
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
