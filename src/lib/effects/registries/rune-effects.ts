import type { Effect, LevelStep, MatchStackSource } from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/** A Legend stack per 100 points: 100 per champion or epic takedown, 25 per large monster, 4 per minion (wiki). */
export const LEGEND_ALACRITY_STACKS = {
	id: "legend-alacrity-stacks",
	name: "Legend: Alacrity stacks",
	sliderMax: 10,
	capped: true,
} as const satisfies MatchStackSource

export const LEGEND_BLOODLINE_STACKS = {
	id: "legend-bloodline-stacks",
	name: "Legend: Bloodline stacks",
	sliderMax: 15,
	capped: true,
} as const satisfies MatchStackSource

/** One per 8 monsters or enemy minions that die near the champion, uncapped (wiki). */
export const OVERGROWTH_STACKS = {
	id: "overgrowth-stacks",
	name: "Overgrowth stacks",
	// The wiki gives no typical count; a laner nears 400 minions (50 stacks) by 30 minutes.
	sliderMax: 75,
} as const satisfies MatchStackSource

/** One per champion hit by an ability, every 15 s, up to 10 (wiki). */
export const MANAFLOW_BAND_STACKS = {
	id: "manaflow-band-stacks",
	name: "Manaflow Band stacks",
	sliderMax: 10,
	capped: true,
} as const satisfies MatchStackSource

/** One per Grasp proc on a champion, uncapped (wiki). */
export const GRASP_STACKS = {
	id: "grasp-stacks",
	name: "Grasp of the Undying procs",
	// The wiki gives no typical count; a long game passes 100 procs.
	sliderMax: 200,
} as const satisfies MatchStackSource

/** One per biscuit eaten or sold; one comes every 2 minutes until 6 (rune text), so 3. */
export const BISCUIT_STACKS = {
	id: "biscuit-stacks",
	name: "Biscuits eaten",
	sliderMax: 3,
	capped: true,
} as const satisfies MatchStackSource

/** A value growing evenly from level 1 to 18, as one step per level. */
function perLevel(first: number, last: number): LevelStep[] {
	return Array.from({ length: 18 }, (_, index) => ({
		from: index + 1,
		value: first + ((last - first) * index) / 17,
	}))
}

/** Rune effects. */
export const RUNE_EFFECTS: readonly Effect[] = [
	{
		id: "nimbus-cloak",
		source: { kind: "rune", runeKey: "NimbusCloak" },
		trigger: { kind: "after-summoner" },
		duration: 2,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				// The rune text gives only 15% - 45%; the brackets are the wiki's (patch V25.22).
				amount: {
					by: "summonerCooldown",
					brackets: [
						{ from: 0, value: 0.15 },
						{ from: 100, value: 0.35 },
						{ from: 250, value: 0.45 },
					],
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Nimbus_Cloak`,
	},
	{
		id: "gathering-storm",
		source: { kind: "rune", runeKey: "GatheringStorm" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "adaptiveForce",
				// The rune text lists 8, 24, 48… AP up to 60 min, then "etc.": 8 × n(n+1)/2, no cap (wiki).
				amount: { by: "gameTime", every: 10, growth: "triangular", step: 8 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Gathering_Storm`,
	},
	{
		// The triggering attack and the next 2 benefit, 3 s between attacks; the cooldown starts when it
		// ends (wiki). Extra stacks from attack resets aren't modeled.
		id: "hail-of-blades",
		source: { kind: "rune", runeKey: "HailOfBlades" },
		trigger: { kind: "on-attack" },
		charges: 3,
		duration: 3,
		cooldown: 10,
		cooldownFrom: "end",
		start: { kind: "ready" },
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: { by: "attackType", melee: 0.9, ranged: 0.6 },
			},
			{
				kind: "onAttackDamage",
				damageType: "true",
				base: { by: "championLevel", steps: perLevel(2, 20) },
				ratios: { bonusAttackDamage: 0.12, abilityPower: 0.1 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Hail_of_Blades`,
	},
	{
		// Wiki: "Gain 3% (+ 1.5% per Legend stack) bonus attack speed, up to 18% at maximum stacks."
		id: "legend-alacrity",
		source: { kind: "rune", runeKey: "LegendAlacrity" },
		trigger: { kind: "always" },
		grants: [
			{ kind: "stat", stat: "attackSpeedPercent", amount: 0.03 },
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: {
					by: "matchStacks",
					source: LEGEND_ALACRITY_STACKS,
					ratio: 0.015,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Legend:_Alacrity`,
	},
	{
		// Wiki: "Gain 0.45% life steal per Legend stack, up to 6.75% at maximum stacks, at which you
		// also gain 85 bonus health."
		id: "legend-bloodline",
		source: { kind: "rune", runeKey: "LegendBloodline" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "lifeStealPercent",
				amount: {
					by: "matchStacks",
					source: LEGEND_BLOODLINE_STACKS,
					ratio: 0.0045,
				},
			},
			{
				kind: "stat",
				stat: "health",
				amount: 85,
				from: { source: LEGEND_BLOODLINE_STACKS, stacks: 15 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Legend:_Bloodline`,
	},
	{
		// Wiki: every 8 units "permanently generates a stack. Each stack grants 3 bonus health. [...]
		// After reaching 15 stacks (120 monsters or minions), your base and bonus health are
		// permanently increased by 3.5%." Here the 3.5% is all bonus health.
		id: "overgrowth",
		source: { kind: "rune", runeKey: "Overgrowth" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "matchStacks", source: OVERGROWTH_STACKS, ratio: 3 },
			},
			{
				kind: "stat",
				stat: "health",
				amount: { by: "stat", stat: "health", ratio: 0.035 },
				from: { source: OVERGROWTH_STACKS, stacks: 15 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Overgrowth`,
	},
	{
		// Wiki: hitting a champion with an ability "permanently increases your maximum mana by 25, up
		// to 250 mana". The mana restored at 250 is left out.
		id: "manaflow-band",
		source: { kind: "rune", runeKey: "ManaflowBand" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "mana",
				amount: {
					by: "matchStacks",
					source: MANAFLOW_BAND_STACKS,
					ratio: 25,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Manaflow_Band`,
	},
	{
		// Wiki: each proc "permanently grant[s] you (5 / 2) bonus health" (melee / ranged). Its damage
		// and heal are left out.
		id: "grasp-of-the-undying",
		source: { kind: "rune", runeKey: "GraspOfTheUndying" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: {
					by: "matchStacks",
					source: GRASP_STACKS,
					ratio: { by: "attackType", melee: 5, ranged: 2 },
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Grasp_of_the_Undying`,
	},
	{
		// Rune text: "Consuming or selling a Biscuit permanently increases your max health by 30." The
		// biscuits' restore is left out.
		id: "biscuit-delivery",
		source: { kind: "rune", runeKey: "BiscuitDelivery" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "matchStacks", source: BISCUIT_STACKS, ratio: 30 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Biscuit_Delivery`,
	},
]
