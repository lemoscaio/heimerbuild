// Teemo: Move Quick's active doubles the passive's speed and stands in for it while it lasts.
// Toxic Shot can't be cast: each attack deals its impact, then a 4 s poison.
// Noxious Trap detonates 1 s after the cast (its arming time), then poisons for 4 s.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Amount, Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

const MOVE_QUICK = `${WIKI}Teemo/Move_Quick`
/** The active doubles the passive's speed and stands in for it while it lasts. */
const MOVE_QUICK_STACKING = { group: "teemo-w-speed", rule: "replace" } as const
const MOVE_QUICK_SPEED: Amount = {
	by: "rank",
	rankStat: "movementSpeedPercent",
}

export const TEEMO_EFFECTS = [
	{
		id: "teemo-w-passive",
		source: { kind: "ability", championKey: "Teemo", slot: "W" },
		trigger: { kind: "while", condition: "not-damaged-recently" },
		endsOn: "damage-taken",
		part: "passive",
		stacking: { ...MOVE_QUICK_STACKING, priority: 0 },
		grants: [
			{ kind: "stat", stat: "movementSpeedPercent", amount: MOVE_QUICK_SPEED },
		],
		since: VERIFIED_ON,
		sourceUrl: MOVE_QUICK,
	},
	{
		id: "teemo-w-active",
		source: { kind: "ability", championKey: "Teemo", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 3,
		part: "active",
		stacking: { ...MOVE_QUICK_STACKING, priority: 1 },
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { ...MOVE_QUICK_SPEED, scale: 2 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: MOVE_QUICK,
	},
	{
		// Each attack's on-hit deals the impact, then poisons: a tick every second for 4 s; an attack refreshes it.
		id: "teemo-e",
		source: { kind: "ability", championKey: "Teemo", slot: "E" },
		trigger: { kind: "on-hit" },
		holder: "target",
		duration: 4,
		grants: [
			{ kind: "abilityDamage", ability: "E", name: "ImpactCalculatedDamage" },
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "E",
					name: "TotalDotDamage",
					scale: 1 / 4,
				},
				every: 1,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Teemo/Toxic_Shot`,
	},
	{
		// The target steps on the trap once it arms, 1 s after the cast (wiki "Arming Time"); then a tick every second for 4 s.
		id: "teemo-r",
		source: { kind: "ability", championKey: "Teemo", slot: "R" },
		trigger: { kind: "after-use" },
		delay: { seconds: 1, label: "detonates" },
		holder: "target",
		duration: 4,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "R",
					name: "TotalDamage",
					scale: 1 / 4,
				},
				every: 1,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Teemo/Noxious_Trap`,
	},
] satisfies readonly Effect[]

export const TEEMO_HIT_RULES = [
	{
		championKey: "Teemo",
		slot: "E",
		noCast: "Toxic Shot has no active: Teemo's attacks apply it",
		since: "16.19",
		sourceUrl: `${WIKI}Teemo/Toxic_Shot`,
	},
	{
		// The poison is the `teemo-r` effect's damage over time.
		championKey: "Teemo",
		slot: "R",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Teemo/Noxious_Trap`,
	},
] satisfies readonly AbilityHitRule[]
