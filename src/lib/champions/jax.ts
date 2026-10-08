// Jax: Relentless Assault stacks attack speed on each hit, up to 8. Empower is an empowered attack
// that resets the attack timer. Counter Strike strikes when recast, 1 s after the cast. Every
// third hit deals Grandmaster-at-Arms' passive damage, and its active its swing. Empowering Leap
// Strike, the dodges, R's every second hit while active and its resistances are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

const R_PASSIVE = "jax-r-passive"

export const JAX_EFFECTS = [
	{
		// Wiki: 5% to 12.5% per stack at levels 1 to 16 (+1.5% at 4, 7, 10, 13, 16), up to 8 stacks
		// for 2.5 s; on-attack, the same moment as on-hit without a windup. All 8 fall off together.
		id: "jax-passive",
		source: { kind: "ability", championKey: "Jax", slot: "passive" },
		trigger: { kind: "on-hit" },
		stacks: { max: 8 },
		duration: 2.5,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: {
					by: "championLevel",
					steps: [
						{ from: 1, value: 0.4 },
						{ from: 4, value: 0.52 },
						{ from: 7, value: 0.64 },
						{ from: 10, value: 0.76 },
						{ from: 13, value: 0.88 },
						{ from: 16, value: 1 },
					],
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jax/Relentless_Assault`,
	},
	{
		// "Counter Strike can be recast after 1 second": the earliest strike, its damage without dodges.
		id: "jax-e",
		source: { kind: "ability", championKey: "Jax", slot: "E" },
		trigger: { kind: "after-use" },
		delay: { seconds: 1, label: "strikes" },
		holder: "target",
		grants: [
			{ kind: "abilityDamage", ability: "E", name: "TotalDamage" },
			{ kind: "abilityDamage", ability: "E", name: "PercentHealthDamage" },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jax/Counter_Strike`,
	},
	{
		// The hits within 2.5 s of each other; at 3 the passive strikes and they start over.
		id: R_PASSIVE,
		source: { kind: "ability", championKey: "Jax", slot: "R" },
		trigger: { kind: "on-hit" },
		label: "hits",
		listed: false,
		stacks: { max: 3 },
		duration: 2.5,
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jax/Grandmaster-at-Arms`,
	},
	{
		id: "jax-r-passive-strike",
		source: { kind: "ability", championKey: "Jax", slot: "R" },
		trigger: { kind: "on-max-stacks", effect: R_PASSIVE },
		label: "third hit",
		resets: { effect: R_PASSIVE, stacks: 0 },
		grants: [{ kind: "abilityDamage", ability: "R", name: "OnHitDamage" }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jax/Grandmaster-at-Arms`,
	},
] satisfies readonly Effect[]

export const JAX_HIT_RULES = [
	{
		championKey: "Jax",
		slot: "W",
		empowersAttack: { resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Jax/Empower`,
	},
	{
		// The strike is the `jax-e` effect's, when he recasts.
		championKey: "Jax",
		slot: "E",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Jax/Counter_Strike`,
	},
	{
		// The active's swing; `OnHitDamage` is the passive's (jax-r-passive-strike).
		championKey: "Jax",
		slot: "R",
		damage: "SwingDamageTotal",
		since: "16.19",
		sourceUrl: `${WIKI}Jax/Grandmaster-at-Arms`,
	},
] satisfies readonly AbilityHitRule[]
