// Brand: each cast adds a Blaze stack (up to 3) and refreshes the burn, 2% of maximum health per
// stack over 4 s. At 3 stacks the target detonates 2 s later, which leaves one stack and keeps
// Blaze at one for 4 s. Pyroclasm's bounces and the abilities' Ablaze bonuses are left out.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

const BLAZE = "brand-blaze"

export const BRAND_EFFECTS = [
	{
		// Wiki conflict, decided (PR 385): the tooltip's 2% over 4 s, not its 0.167% per tick (2.67%).
		// One shared tick timer, not one per stack: same total, ticks shift by under 0.25 s.
		id: BLAZE,
		source: { kind: "ability", championKey: "Brand", slot: "passive" },
		trigger: { kind: "on-cast" },
		holder: "target",
		duration: 4,
		stacks: { max: 3 },
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "passive",
					name: "PercentHealthDamage",
					scale: 1 / 16,
				},
				every: 0.25,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Brand/Blaze`,
	},
	{
		// It runs the 4 s the wiki allows only one stack after a ring exploded.
		id: "brand-blaze-detonation",
		source: { kind: "ability", championKey: "Brand", slot: "passive" },
		label: "detonation",
		trigger: { kind: "on-max-stacks", effect: BLAZE },
		holder: "target",
		startsAfter: {
			label: "unstable",
			ending: "it detonates",
			duration: 2,
			endsOn: [],
		},
		duration: 4,
		resets: { effect: BLAZE, stacks: 1 },
		grants: [
			{ kind: "abilityDamage", ability: "passive", name: "ExplosionDamage" },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Brand/Blaze`,
	},
] satisfies readonly Effect[]
