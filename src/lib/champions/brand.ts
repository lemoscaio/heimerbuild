// Brand: each hit adds a Blaze stack (up to 3) and refreshes the burn, 2% of maximum health per
// stack over 4 s. At 3 stacks the target detonates 2 s later, which leaves one stack and keeps
// Blaze at one for 4 s. Pyroclasm hits the target 1 to 3 times, and Pillar of Flame deals 25% more
// to an Ablaze target. Sear's stun, Conflagration's spread and Pyroclasm's slow deal no damage.
import type {
	AbilityHitRule,
	AbilityVariant,
} from "../combat/registries/ability-hits"
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
		// A stack per hit: each of Pyroclasm's hits adds one.
		trigger: { kind: "on-cast", perHit: true },
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

/**
 * Wiki: "bounces between nearby enemies and Brand up to four times [...] having a 0.15-second delay
 * between bounces". Back to the target through Brand (or another enemy) is two bounces, 0.3 s;
 * travel time isn't counted, so on a lone target 3 hits 0.3 s apart.
 */
function pyroclasmHits(count: number): AbilityVariant {
	return {
		id: String(count),
		label: String(count),
		...(count > 1 && { hits: { count, every: 0.3 } }),
	}
}

export const BRAND_HIT_RULES = [
	{
		// Ablaze is read before Pillar of Flame's own stack, so a W alone deals its normal damage.
		championKey: "Brand",
		slot: "W",
		whenTargetHas: { effect: BLAZE, damage: "EmpoweredDamage" },
		since: "16.19",
		sourceUrl: `${WIKI}Brand/Pillar_of_Flame`,
	},
	{
		// "Total Single-Target Damage" is 3 hits: the most one target takes.
		championKey: "Brand",
		slot: "R",
		variants: [pyroclasmHits(1), pyroclasmHits(2), pyroclasmHits(3)],
		variantsLabel: { text: "Hits", name: "Hits on the target" },
		since: "16.19",
		sourceUrl: `${WIKI}Brand/Pyroclasm`,
	},
] satisfies readonly AbilityHitRule[]
