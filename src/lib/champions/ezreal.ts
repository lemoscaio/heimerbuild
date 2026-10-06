// Ezreal: Mystic Shot applies on-hit effects like an attack (it spends a spellblade).
// Essence Flux deals nothing by itself: it marks the target, and his next attack or ability detonates it.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

const ESSENCE_FLUX = "ezreal-w"

export const EZREAL_EFFECTS = [
	{
		// The orb marks the target for 4 s; its damage waits for the attack or ability that detonates it.
		id: "ezreal-w-mark",
		source: { kind: "ability", championKey: "Ezreal", slot: "W" },
		trigger: { kind: "on-cast", slots: ["W"] },
		applies: {
			mark: ESSENCE_FLUX,
			duration: 4,
			consumedBy: ["attack", "ability"],
		},
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Ezreal/Essence_Flux`,
	},
	{
		id: "ezreal-w-detonation",
		source: { kind: "ability", championKey: "Ezreal", slot: "W" },
		trigger: { kind: "on-mark-consumed", mark: ESSENCE_FLUX },
		grants: [{ kind: "abilityDamage", ability: "W", name: "Damage" }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Ezreal/Essence_Flux`,
	},
] satisfies readonly Effect[]

export const EZREAL_HIT_RULES = [
	{
		championKey: "Ezreal",
		slot: "Q",
		onHit: true,
		since: "16.19",
		sourceUrl: `${WIKI}Ezreal/Mystic_Shot`,
	},
	{
		// The orb only marks; the detonation is the `ezreal-w-detonation` effect.
		championKey: "Ezreal",
		slot: "W",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Ezreal/Essence_Flux`,
	},
] satisfies readonly AbilityHitRule[]
