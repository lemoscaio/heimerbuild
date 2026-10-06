// Quinn: Q, E and R casts mark the target with Harrier, and Valor marks it on its own (7 s, less with crit).
// Her next attack consumes the mark: Harrier's damage and Heightened Senses' speeds. Skystrike isn't simulated.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect, MarkApplication } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

const HARRIER = "quinn-harrier"
const HARRIER_MARK = {
	mark: HARRIER,
	duration: 4,
	consumedBy: ["attack"],
} as const satisfies MarkApplication

export const QUINN_EFFECTS = [
	{
		// Blinding Assault, Vault and Skystrike mark the target for 4 s; a basic attack consumes it.
		id: "quinn-harrier-mark",
		source: { kind: "ability", championKey: "Quinn", slot: "passive" },
		trigger: { kind: "on-cast", slots: ["Q", "E", "R"] },
		applies: HARRIER_MARK,
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Quinn/Harrier`,
	},
	{
		// Valor marks on its own: 7 × 0.99 per 1% crit chance, from when the last mark left (wiki).
		id: "quinn-harrier-valor",
		source: { kind: "ability", championKey: "Quinn", slot: "passive" },
		trigger: { kind: "periodic", idle: 1 },
		applies: HARRIER_MARK,
		cooldown: {
			by: "statDecay",
			stat: "critChance",
			base: 7,
			factor: 0.99,
			per: 0.01,
		},
		cooldownFrom: "mark-end",
		start: { kind: "marked" },
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Quinn/Harrier`,
	},
	{
		id: "quinn-harrier",
		source: { kind: "ability", championKey: "Quinn", slot: "passive" },
		trigger: { kind: "on-mark-consumed", mark: HARRIER },
		grants: [
			{ kind: "abilityDamage", ability: "passive", name: "BonusDamage" },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Quinn/Harrier`,
	},
	{
		// Attacking a Harrier target grants the speeds for 2 s; consuming the mark stands in for it.
		id: "quinn-w-passive",
		source: { kind: "ability", championKey: "Quinn", slot: "W" },
		trigger: { kind: "on-mark-consumed", mark: HARRIER },
		part: "passive",
		duration: 2,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Quinn/Heightened_Senses`,
	},
] satisfies readonly Effect[]

export const QUINN_HIT_RULES = [
	{
		championKey: "Quinn",
		slot: "R",
		notModeled:
			"Skystrike, the recast after the 2 s channel, is not simulated yet",
		since: "16.19",
		sourceUrl: `${WIKI}Quinn/Behind_Enemy_Lines`,
	},
] satisfies readonly AbilityHitRule[]
