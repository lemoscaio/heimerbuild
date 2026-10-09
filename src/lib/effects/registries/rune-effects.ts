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

/** One per champion Dark Harvest damages, uncapped (wiki). */
export const DARK_HARVEST_SOULS = {
	id: "dark-harvest-souls",
	name: "Dark Harvest souls",
	// The wiki gives no typical count; a long game passes 30 souls.
	sliderMax: 50,
} as const satisfies MatchStackSource

/** One per biscuit eaten or sold; one comes every 2 minutes until 6 (rune text), so 3. */
export const BISCUIT_STACKS = {
	id: "biscuit-stacks",
	name: "Biscuits eaten",
	sliderMax: 3,
	capped: true,
} as const satisfies MatchStackSource

const ELECTROCUTE_STACKS = "electrocute-stacks"
const PRESS_THE_ATTACK_STACKS = "press-the-attack-stacks"

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
		// Wiki: "Applying 3 stacks to a target within a 3 second period", one "per cast instance"; "The
		// 3 second timer is non-refreshing". No stack while Electrocute is on cooldown.
		id: ELECTROCUTE_STACKS,
		source: { kind: "rune", runeKey: "Electrocute" },
		label: "stacks",
		trigger: { kind: "on-action-damage" },
		holder: "target",
		duration: 3,
		stacks: { max: 3, keepsDuration: true },
		requiresReady: "electrocute",
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Electrocute`,
	},
	{
		// Wiki: "struck by lightning after a 0.25-second delay, dealing them 60 + 10 × level (+ 10% bonus
		// AD) (+ 5% AP)", physical or magic by the larger ratio part; cooldown 20 s.
		id: "electrocute",
		source: { kind: "rune", runeKey: "Electrocute" },
		trigger: { kind: "on-max-stacks", effect: ELECTROCUTE_STACKS },
		delay: { seconds: 0.25, label: "strikes" },
		cooldown: 20,
		consumes: ELECTROCUTE_STACKS,
		grants: [
			{
				kind: "damage",
				damageType: "variable",
				base: { by: "championLevel", steps: perLevel(70, 240) },
				ratios: { bonusAttackDamage: 0.1, abilityPower: 0.05 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Electrocute`,
	},
	{
		// Wiki: basic attacks on-hit "apply a stack for 4 seconds, refreshing on subsequent
		// applications [...] stacking up to 3 times"; none while its 6 s cooldown runs.
		id: PRESS_THE_ATTACK_STACKS,
		source: { kind: "rune", runeKey: "PressTheAttack" },
		label: "stacks",
		trigger: { kind: "on-hit", attacksOnly: true },
		holder: "target",
		duration: 4,
		stacks: { max: 3 },
		requiresReady: "press-the-attack",
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Press_the_Attack`,
	},
	{
		// Wiki: 40 to 160 "bonus adaptive damage and [...] 8% increased damage against champions until 5
		// seconds after exiting combat" (the whole combo); cooldown 6 s "after consuming" the stacks.
		id: "press-the-attack",
		source: { kind: "rune", runeKey: "PressTheAttack" },
		trigger: { kind: "on-max-stacks", effect: PRESS_THE_ATTACK_STACKS },
		cooldown: 6,
		consumes: PRESS_THE_ATTACK_STACKS,
		duration: Number.POSITIVE_INFINITY,
		grants: [
			{
				kind: "damage",
				damageType: "adaptive",
				base: { by: "championLevel", steps: perLevel(40, 160) },
				ratios: {},
			},
			{ kind: "damageAmplification", amount: 0.08 },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Press_the_Attack`,
	},
	{
		// Wiki: damage to champions gives stacks "lasting for 5 seconds, refreshing [...] up to 12": 2 (1
		// ranged) per attack, 2 per other damage. Its healing at 12 is left out; the combo shows no heals.
		id: "conqueror",
		source: { kind: "rune", runeKey: "Conqueror" },
		trigger: { kind: "on-action-damage" },
		duration: 5,
		stacks: {
			max: 12,
			gain: { attack: { by: "attackType", melee: 2, ranged: 1 }, other: 2 },
		},
		grants: [
			{
				kind: "stat",
				stat: "adaptiveForce",
				// Wiki: 1.8 + (4 − 1.8) / 17 × (level − 1) per stack, so 21.6 to 48 at 12.
				amount: { by: "championLevel", steps: perLevel(21.6, 48) },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Conqueror`,
	},
	{
		// Wiki: attacks "grant a stack for 6 seconds, refreshing on subsequent attacks and stacking up to
		// 6 times"; at its end all stacks go at once here (the wiki: one, then one every 0.3 s).
		id: "lethal-tempo",
		source: { kind: "rune", runeKey: "LethalTempo" },
		trigger: { kind: "on-attack" },
		duration: 6,
		stacks: { max: 6 },
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				// Wiki: 6% per stack, ranged × 0.8 (4.8%); the rune text's 4% ranged is outdated.
				amount: { by: "attackType", melee: 0.36, ranged: 0.288 },
			},
			{
				// Wiki: at 6 stacks a bolt deals 9 to 30 (ranged × 0.667) "bonus adaptive damage [...] increased
				// by 1% per 1% bonus attack speed"; the rune text's ranged 6 to 24 is wrong (wiki notes).
				kind: "onAttackDamage",
				atMaxStacks: true,
				damageType: "adaptive",
				base: {
					by: "attackType",
					melee: { by: "championLevel", steps: perLevel(9, 30) },
					ranged: {
						by: "championLevel",
						steps: perLevel(9 * 0.667, 30 * 0.667),
					},
				},
				ratios: {},
				perBonusAttackSpeed: 1,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Lethal_Tempo`,
	},
	{
		// Wiki: an attack or ability's damage sends Aery "to pounce at them over 0.45 seconds"; she lingers
		// 2 s, then flies back. Her return isn't counted (no travel), so she goes again 2.45 s after.
		id: "summon-aery",
		source: { kind: "rune", runeKey: "SummonAery" },
		trigger: { kind: "on-action-damage" },
		delay: { seconds: 0.45, label: "pounces" },
		cooldown: 2.45,
		grants: [
			{
				kind: "damage",
				damageType: "adaptive",
				base: { by: "championLevel", steps: perLevel(10, 50) },
				ratios: { bonusAttackDamage: 0.1, abilityPower: 0.05 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Summon_Aery`,
	},
	{
		// Wiki: ability damage hurls a comet that "lands after 0.8" s, 15 to 100 (+ 10% bonus AD) (+ 5%
		// AP), up to double at 750 range; the combo has no distance, so the least. Cooldown 20 to 8 s.
		id: "arcane-comet",
		source: { kind: "rune", runeKey: "ArcaneComet" },
		trigger: { kind: "on-ability-damage" },
		delay: { seconds: 0.8, label: "lands" },
		cooldown: { by: "championLevel", steps: perLevel(20, 8) },
		grants: [
			{
				kind: "damage",
				damageType: "variable",
				base: { by: "championLevel", steps: perLevel(15, 100) },
				ratios: { bonusAttackDamage: 0.1, abilityPower: 0.05 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Arcane_Comet`,
	},
	{
		// Wiki: the first damage of combat grants First Strike "for 3 seconds, causing all of your
		// post-mitigation damage [...] to deal 7% bonus true damage", that hit's too. Its gold is left out.
		id: "first-strike",
		source: { kind: "rune", runeKey: "FirstStrike" },
		trigger: { kind: "on-action-damage" },
		duration: 3,
		cooldown: { by: "championLevel", steps: perLevel(25, 15) },
		grants: [{ kind: "bonusTrueDamage", amount: 0.07 }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}First_Strike`,
	},
	{
		// The souls the build sets, which Dark Harvest's damage reads.
		id: "dark-harvest-soul-count",
		source: { kind: "rune", runeKey: "DarkHarvest" },
		trigger: { kind: "always" },
		label: "Souls",
		grants: [
			{
				kind: "counter",
				counter: "souls",
				amount: { by: "matchStacks", source: DARK_HARVEST_SOULS },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Dark_Harvest`,
	},
	{
		// Wiki: damage to a champion "below 50% of their maximum health deals 30 (+ 11 per Soul) (+ 10%
		// bonus AD) (+ 5% AP) bonus adaptive damage"; cooldown 35 s. Here the hit that takes it below.
		id: "dark-harvest",
		source: { kind: "rune", runeKey: "DarkHarvest" },
		trigger: { kind: "on-action-damage", targetBelow: 0.5 },
		cooldown: 35,
		grants: [
			{
				kind: "damage",
				damageType: "adaptive",
				base: [
					30,
					{ by: "matchStacks", source: DARK_HARVEST_SOULS, ratio: 11 },
				],
				ratios: { bonusAttackDamage: 0.1, abilityPower: 0.05 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Dark_Harvest`,
	},
	{
		// Wiki: 4 stacks after 4 s in combat; then "your next basic attack on-hit [...] deal[s] bonus magic
		// damage equal to 3.5% (1.4% ranged) of your maximum health". Its heal is left out.
		id: "grasp-of-the-undying-proc",
		source: { kind: "rune", runeKey: "GraspOfTheUndying" },
		trigger: { kind: "on-hit", attacksOnly: true },
		cooldown: 4,
		start: { kind: "ready" },
		grants: [
			{
				kind: "damage",
				damageType: "magic",
				base: {
					by: "stat",
					stat: "health",
					ratio: { by: "attackType", melee: 0.035, ranged: 0.014 },
				},
				ratios: {},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Grasp_of_the_Undying`,
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
