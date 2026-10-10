// Darius: his attacks, Decimate's blade and Noxian Guillotine add a Hemorrhage stack (up to 5),
// a bleed every 1.25 s for 5 s; at 5 stacks Noxian Might grants bonus AD for 5 s. Decimate swings
// after its 0.75 s windup; the handle deals 35% and adds no stack. Crippling Strike is an empowered
// attack that resets the attack timer. Noxian Guillotine deals 20% more per stack. The heal, slows,
// pull, Noxian Might's instant 5 stacks and R's reset on a kill are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

const HEMORRHAGE = "darius-hemorrhage"

export const DARIUS_EFFECTS = [
	{
		// `BleedDamagePerStack` is a stack's total over 5 s: a quarter of it every 1.25 s, per stack.
		id: HEMORRHAGE,
		source: { kind: "ability", championKey: "Darius", slot: "passive" },
		trigger: { kind: "on-hit" },
		holder: "target",
		duration: 5,
		stacks: { max: 5 },
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "passive",
					name: "BleedDamagePerStack",
					scale: 1 / 4,
				},
				every: 1.25,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Darius/Hemorrhage`,
	},
	{
		// Wiki: 30, +5 per level until 10, +10 until 13, then +25 per level.
		id: "darius-noxian-might",
		source: { kind: "ability", championKey: "Darius", slot: "passive" },
		trigger: { kind: "on-max-stacks", effect: HEMORRHAGE },
		label: "Noxian Might",
		duration: 5,
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: {
					by: "championLevel",
					steps: [
						30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 85, 95, 105, 130, 155, 180,
						205, 230,
					].map((value, index) => ({ from: index + 1, value })),
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Darius/Hemorrhage`,
	},
] satisfies readonly Effect[]

export const DARIUS_HIT_RULES = [
	{
		// The handle (inner radius) deals 35% of the blade's damage and adds no Hemorrhage stack.
		championKey: "Darius",
		slot: "Q",
		landsAtCastEnd: true,
		variants: [
			{
				id: "blade",
				label: "Outer blade",
				damage: "BladeDamage",
				triggers: HEMORRHAGE,
			},
			{ id: "handle", label: "Inner handle", damage: "HandleDamage" },
		],
		since: "16.19",
		sourceUrl: `${WIKI}Darius/Decimate`,
	},
	{
		// `EmpoweredAttackDamage` is the whole attack (wiki: 40 to 60% AD bonus). Wiki: "deals basic
		// damage but will also trigger spell effects [...] This includes the basic attack itself."
		championKey: "Darius",
		slot: "W",
		empowersAttack: {
			includesAttack: true,
			resetsAttack: true,
			spellAttack: true,
		},
		since: "16.19",
		sourceUrl: `${WIKI}Darius/Crippling_Strike`,
	},
	{
		// "Noxian Guillotine applies Hemorrhage after the damage", 20% more per stack, 100% at 5.
		championKey: "Darius",
		slot: "R",
		damage: "Damage",
		perTargetStack: { effect: HEMORRHAGE, bonus: 0.2 },
		triggers: HEMORRHAGE,
		since: "16.19",
		sourceUrl: `${WIKI}Darius/Noxian_Guillotine`,
	},
] satisfies readonly AbilityHitRule[]
