// Janna: Zephyr's passive movement speed (its rank part plus 2% per 100 AP) is always on.
// Zephyr's damage adds Tailwind's 30% of her bonus movement speed.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const JANNA_EFFECTS = [
	{
		// The rank part was an always-on rank stat; it moved here so the row shows both parts.
		id: "janna-w-passive",
		source: { kind: "ability", championKey: "Janna", slot: "W" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { by: "rank", rankStat: "movementSpeedPercent" },
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				// 2% per 100 AP.
				amount: { by: "stat", stat: "abilityPower", ratio: 0.0002 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Janna/Zephyr`,
	},
] satisfies readonly Effect[]

export const JANNA_HIT_RULES = [
	{
		// Zephyr adds Tailwind's 30% of bonus movement speed to its damage.
		championKey: "Janna",
		slot: "W",
		damage: ["TotalDamage", "spell.TailwindSelf:BonusDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Janna/Zephyr`,
	},
] satisfies readonly AbilityHitRule[]
