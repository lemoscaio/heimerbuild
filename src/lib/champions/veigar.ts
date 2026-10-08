// Veigar: Phenomenal Evil Power's stacks give 1 AP each (the build's match stacks). Primordial Burst
// isn't simulated: it grows with the target's missing health.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** 1 per champion hit by an ability, 5 per champion takedown (wiki), uncapped. */
export const PHENOMENAL_EVIL_STACKS = {
	id: "phenomenal-evil",
	name: "Phenomenal Evil stacks",
	// The wiki gives no typical count; late games reach several hundred.
	sliderMax: 1000,
} as const satisfies MatchStackSource

export const VEIGAR_EFFECTS = [
	{
		// Wiki: "For each stack, Veigar gains 1 ability power."
		id: "veigar-passive",
		source: { kind: "ability", championKey: "Veigar", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: PHENOMENAL_EVIL_STACKS },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Veigar/Phenomenal_Evil_Power`,
	},
] satisfies readonly Effect[]

export const VEIGAR_HIT_RULES = [
	{
		championKey: "Veigar",
		slot: "R",
		notModeled:
			"Primordial Burst grows with the target's missing health, which the formulas don't read yet",
		since: "16.19",
		sourceUrl: `${WIKI}Veigar/Primordial_Burst`,
	},
] satisfies readonly AbilityHitRule[]
