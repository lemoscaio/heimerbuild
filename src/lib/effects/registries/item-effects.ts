import { MANA_RESOURCE } from "../../stats/compute-stats"
import type {
	Effect,
	LevelStep,
	MatchStackSource,
	StacksThreshold,
} from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/** Glory: 2 per champion kill, 1 per assist, up to 10, 5 lost on death (wiki). */
export const DARK_SEAL_GLORY = {
	id: "dark-seal-stacks",
	name: "Dark Seal Glory",
	sliderMax: 10,
	capped: true,
} as const satisfies MatchStackSource

/** Glory: 4 per champion kill, 2 per assist, up to 25, 10 lost on death; Dark Seal's carry over (wiki). */
export const MEJAI_GLORY = {
	id: "mejai-stacks",
	name: "Mejai's Glory",
	sliderMax: 25,
	capped: true,
} as const satisfies MatchStackSource

/** Colossal Consumption's permanent health, which the build sets as the health itself, uncapped (wiki). */
export const HEARTSTEEL_HEALTH = {
	id: "heartsteel-health",
	name: "Heartsteel bonus health",
	// The wiki gives no typical amount; each proc grows with the champion's maximum health.
	sliderMax: 1500,
} as const satisfies MatchStackSource

/**
 * Manaflow's bonus mana, 0 to 360 (wiki): one count for Tear, Manamune and Archangel's, since they share
 * the Manaflow group and its stacks carry over from one to another.
 */
export const MANAFLOW_MANA = {
	id: "manaflow-mana",
	name: "Manaflow bonus mana",
	sliderMax: 360,
	capped: true,
	// Wiki, Tear of the Goddess notes: "Manaless champions cannot trigger Manaflow".
	resource: MANA_RESOURCE,
} as const satisfies MatchStackSource

/** Manamune and Archangel's Staff transform at 360 Manaflow; their upgrades' Awe holds from there. */
export const MANAFLOW_TRANSFORM = {
	source: MANAFLOW_MANA,
	stacks: 360,
} as const satisfies StacksThreshold

const KRAKEN_SLAYER_STACKS = "kraken-slayer-stacks"
const SEETHING_STRIKE = "guinsoos-rageblade-seething-strike"
const PHANTOM_STACKS = "guinsoos-rageblade-phantom-stacks"

/**
 * Bring It Down's damage by level: wiki item data `150 + 5 × (x − 1)` with x = 1 to level 8, then
 * level − 7 (155 at 9, 200 at 18); ranged deals 80% of it.
 */
function bringItDown(scale: number): LevelStep[] {
	return [
		{ from: 1, value: 150 * scale },
		...Array.from({ length: 10 }, (_, index) => ({
			from: 9 + index,
			value: (155 + 5 * index) * scale,
		})),
	]
}

/**
 * Item effects. The spellblades, Torment and Carve are the combat simulator's (`listed: false` keeps
 * the spellblades off the stats panel); the match stacks are the panel's too. The ratios match
 * CommunityDragon's 16.19 item data (`SpellbladeMultiplier`, `SpellbladeADRatio`, `LichBaneAPValue`).
 * A spellblade is primed at an ability's cast and spent by the next on-hit, which deals its damage
 * and starts its cooldown (wiki "Spellblade"). Liandry's burn checked on the wiki on 2026-10-06,
 * Black Cleaver's Carve on 2026-10-07, the on-hit items (issue 418) on 2026-10-09: their damage is
 * an `on-hit` effect's, so an ability that applies on-hit applies it too (`listed: false`).
 */
export const ITEM_EFFECTS: readonly Effect[] = [
	{
		id: "sheen-spellblade",
		source: { kind: "item", itemId: "3057" },
		trigger: { kind: "after-ability" },
		listed: false,
		duration: 10,
		cooldown: 1.5,
		endsOn: "on-hit",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 1 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Sheen`,
	},
	{
		id: "trinity-force-spellblade",
		source: { kind: "item", itemId: "3078" },
		trigger: { kind: "after-ability" },
		listed: false,
		duration: 10,
		cooldown: 1.5,
		endsOn: "on-hit",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 2 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Trinity_Force`,
	},
	{
		id: "lich-bane-spellblade",
		source: { kind: "item", itemId: "3100" },
		trigger: { kind: "after-ability" },
		listed: false,
		duration: 10,
		cooldown: 1.5,
		endsOn: "on-hit",
		grants: [
			{
				kind: "damage",
				damageType: "magic",
				ratios: { baseAttackDamage: 0.75, abilityPower: 0.45 },
			},
			{ kind: "stat", stat: "attackSpeedPercent", amount: 0.5 },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Lich_Bane`,
	},
	{
		// Torment: ability damage burns for 1% of the target's maximum health every 0.5 s for 3 s (wiki).
		// To verify: the first tick's time (0.5 s after) is not on the wiki page in `sourceUrl`.
		id: "liandrys-torment-burn",
		source: { kind: "item", itemId: "6653" },
		trigger: { kind: "on-ability-damage" },
		holder: "target",
		duration: 3,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "targetHealth",
					damageType: "magic",
					health: "maximum",
					ratio: 0.01,
				},
				every: 0.5,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Liandry%27s_Torment`,
	},
	{
		// Carve: physical damage adds a stack for 6 s, refreshed, up to 5: 6% armor each, 30% at 5 (wiki).
		id: "black-cleaver-carve",
		source: { kind: "item", itemId: "3071" },
		trigger: { kind: "on-damage", damageType: "physical" },
		holder: "target",
		label: "Carve",
		duration: 6,
		stacks: { max: 5 },
		grants: [
			{
				kind: "resistReduction",
				resist: "armor",
				mode: "percent",
				amount: 0.3,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Black_Cleaver`,
	},
	{
		// Wiki: "For every stack, gain 4 ability power, up to 40 at maximum stacks."
		id: "dark-seal-glory",
		source: { kind: "item", itemId: "1082" },
		trigger: { kind: "always" },
		label: "Glory",
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: DARK_SEAL_GLORY, ratio: 4 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Dark_Seal`,
	},
	{
		// Wiki: "For every stack, gain 5 ability power, up to 125 at maximum stacks. If you have at
		// least 10 stacks, also gain 10% bonus movement speed."
		id: "mejai-glory",
		source: { kind: "item", itemId: "3041" },
		trigger: { kind: "always" },
		label: "Glory",
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: MEJAI_GLORY, ratio: 5 },
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: 0.1,
				from: { source: MEJAI_GLORY, stacks: 10 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Mejai%27s_Soulstealer`,
	},
	{
		// Wiki: an attack "grant[s] you permanent bonus health equal to 10% of that amount".
		id: "heartsteel-colossal-consumption",
		source: { kind: "item", itemId: "3084" },
		trigger: { kind: "always" },
		label: "Colossal Consumption",
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "matchStacks", source: HEARTSTEEL_HEALTH },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Heartsteel`,
	},
	{
		// Wiki, checked 2026-10-09: Manaflow grants "3 bonus mana, increased to 6 if they are a
		// champion, up to maximum of 360 bonus mana".
		id: "tear-of-the-goddess-manaflow",
		source: { kind: "item", itemId: "3070" },
		trigger: { kind: "always" },
		label: "Manaflow",
		grants: [
			{
				kind: "stat",
				stat: "mana",
				amount: { by: "matchStacks", source: MANAFLOW_MANA },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Tear_of_the_Goddess`,
	},
	{
		// Wiki, checked 2026-10-09: Manaflow up to 360 bonus mana; Awe "grants bonus attack damage equal
		// to 2% maximum mana". At 360 the build's Manamune is Muramana (`effectiveItems`, issue 436).
		id: "manamune-awe",
		source: { kind: "item", itemId: "3004" },
		trigger: { kind: "always" },
		label: "Manaflow and Awe",
		grants: [
			{
				kind: "stat",
				stat: "mana",
				amount: { by: "matchStacks", source: MANAFLOW_MANA },
			},
			{
				kind: "stat",
				stat: "attackDamage",
				amount: { by: "stat", stat: "mana", ratio: 0.02 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Manamune`,
	},
	{
		// Wiki, checked 2026-10-09: Manaflow up to 360 bonus mana, an innate stat of the item since
		// V25.05; Awe "grants ability power equal to 1% bonus mana". At 360 it is Seraph's Embrace.
		id: "archangels-staff-awe",
		source: { kind: "item", itemId: "3003" },
		trigger: { kind: "always" },
		label: "Manaflow and Awe",
		grants: [
			{
				kind: "stat",
				stat: "mana",
				amount: { by: "matchStacks", source: MANAFLOW_MANA },
			},
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "stat", stat: "mana", part: "bonus", ratio: 0.01 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Archangel%27s_Staff`,
	},
	{
		// Wiki, checked 2026-10-09: Awe "grants bonus attack damage equal to 2% maximum mana"; the 1000
		// mana is the item's. From 360 Manaflow, the count the build keeps, so the row keeps its input.
		id: "muramana-awe",
		source: { kind: "item", itemId: "3042" },
		trigger: { kind: "always" },
		label: "Awe",
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: { by: "stat", stat: "mana", ratio: 0.02 },
				from: MANAFLOW_TRANSFORM,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Muramana`,
	},
	{
		// Wiki, checked 2026-10-10: "basic attacks on-hit [...] deal 1.2% of maximum mana"; an attack
		// that is also spell damage "will apply Shock as an ability" (Crippling Strike, `spellAttack`).
		id: "muramana-shock-attack",
		source: { kind: "item", itemId: "3042" },
		trigger: { kind: "on-hit", attacksOnly: true, notSpellAttack: true },
		listed: false,
		label: "Shock",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				base: { by: "stat", stat: "mana", ratio: 0.012 },
				ratios: {},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Muramana`,
	},
	{
		// Wiki, checked 2026-10-10: ability damage deals "4% (melee) or 3% (ranged) of maximum mana",
		// "once every 6.5 seconds from the same cast instance", "unless the damage also counts as proc damage".
		id: "muramana-shock-ability",
		source: { kind: "item", itemId: "3042" },
		trigger: {
			kind: "on-action-damage",
			abilitiesOnly: true,
			castInstance: { lockout: 6.5 },
			notProc: true,
		},
		listed: false,
		onHitDamage: true,
		label: "Shock",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				base: {
					by: "stat",
					stat: "mana",
					ratio: { by: "attackType", melee: 0.04, ranged: 0.03 },
				},
				ratios: {},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Muramana`,
	},
	{
		// Wiki, checked 2026-10-09: Awe "grants ability power equal to 2% bonus mana" (CommunityDragon
		// `APFromMana` 0.02 of bonus mana). Lifeline's shield is out of scope (issue 436).
		id: "seraphs-embrace-awe",
		source: { kind: "item", itemId: "3040" },
		trigger: { kind: "always" },
		label: "Awe",
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "stat", stat: "mana", part: "bonus", ratio: 0.02 },
				from: MANAFLOW_TRANSFORM,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Seraph%27s_Embrace`,
	},
	{
		// Wiki, checked 2026-10-08: "Magical Opus: Increase your ability power by 30%."
		id: "rabadons-deathcap-magical-opus",
		source: { kind: "item", itemId: "3089" },
		trigger: { kind: "always" },
		label: "Magical Opus",
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "percentOfTotal", stat: "abilityPower", ratio: 0.3 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Rabadon%27s_Deathcap`,
	},
	{
		// Wiki: "Basic attacks deal 15 bonus physical damage on-hit."
		id: "recurve-bow-sting",
		source: { kind: "item", itemId: "1043" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Sting",
		grants: [{ kind: "damage", damageType: "physical", base: 15, ratios: {} }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Recurve_Bow`,
	},
	{
		// Wiki: "Basic attacks deal 45 bonus magic damage on-hit."
		id: "wits-end-fray",
		source: { kind: "item", itemId: "3091" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Fray",
		grants: [{ kind: "damage", damageType: "magic", base: 45, ratios: {} }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Wit%27s_End`,
	},
	{
		// Wiki: "Basic attacks deal 15 (+ 15% AP) bonus magic damage on-hit."
		id: "nashors-tooth-icathian-bite",
		source: { kind: "item", itemId: "3115" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Icathian Bite",
		grants: [
			{
				kind: "damage",
				damageType: "magic",
				base: 15,
				ratios: { abilityPower: 0.15 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Nashor%27s_Tooth`,
	},
	{
		// Wiki: "Basic attacks deal 30 (+10% bonus AD) (+ 10% AP) bonus magic damage on-hit."
		id: "terminus-shadow",
		source: { kind: "item", itemId: "3302" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Shadow",
		grants: [
			{
				kind: "damage",
				damageType: "magic",
				base: 30,
				ratios: { bonusAttackDamage: 0.1, abilityPower: 0.1 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Terminus`,
	},
	{
		// Wiki: on-hit "(Melee 1% / Ranged 0.5%) maximum health bonus physical damage to the target"
		// (the user's health). The cone behind it and Titanic Crescent (an active) are left out.
		id: "titanic-hydra-cleave",
		source: { kind: "item", itemId: "3748" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Cleave",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				base: {
					by: "stat",
					stat: "health",
					ratio: { by: "attackType", melee: 0.01, ranged: 0.005 },
				},
				ratios: {},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Titanic_Hydra`,
	},
	{
		// Wiki: "bonus physical damage on-hit equal to (Melee 9% / Ranged 6%) of the target's current
		// health", read as the attack began ("calculates at the beginning of the damage event").
		id: "blade-of-the-ruined-king-mists-edge",
		source: { kind: "item", itemId: "3153" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Mist's Edge",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				ratios: {},
				targetHealth: {
					health: "current",
					ratio: { by: "attackType", melee: 0.09, ranged: 0.06 },
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Blade_of_the_Ruined_King`,
	},
	{
		// Wiki: attacks "grant a stack for 4 seconds, up to 2 stacks. At 2 stacks, the next basic attack
		// consumes all stacks": here 3 stacks, the third striking. Ranged gains them on-hit too.
		id: KRAKEN_SLAYER_STACKS,
		source: { kind: "item", itemId: "6672" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "stacks",
		duration: 4,
		stacks: { max: 3 },
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Kraken_Slayer`,
	},
	{
		// Wiki: "(Melee 150 – 210 / Ranged 120 – 168) (based on level) bonus physical damage on-hit,
		// increased by 0% – 75% (based on target's missing health)"; levels 19 and 20 give the 210.
		id: "kraken-slayer-bring-it-down",
		source: { kind: "item", itemId: "6672" },
		trigger: { kind: "on-max-stacks", effect: KRAKEN_SLAYER_STACKS },
		consumes: KRAKEN_SLAYER_STACKS,
		onHitDamage: true,
		label: "Bring It Down",
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				base: {
					by: "attackType",
					melee: { by: "championLevel", steps: bringItDown(1) },
					ranged: { by: "championLevel", steps: bringItDown(0.8) },
				},
				ratios: {},
				missingHealthBonus: 0.75,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Kraken_Slayer`,
	},
	{
		// Wiki: "Basic attacks deal 30 bonus magic damage on-hit."
		id: "guinsoos-rageblade-wrath",
		source: { kind: "item", itemId: "3124" },
		trigger: { kind: "on-hit" },
		listed: false,
		label: "Wrath",
		grants: [{ kind: "damage", damageType: "magic", base: 30, ratios: {} }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Guinsoo%27s_Rageblade`,
	},
	{
		// Wiki: attacks "grant 8% bonus attack speed for 4 seconds, stacking up to 4 times" (on-attack
		// in game; here as the attack lands).
		id: SEETHING_STRIKE,
		source: { kind: "item", itemId: "3124" },
		trigger: { kind: "on-hit", attacksOnly: true },
		listed: false,
		label: "Seething Strike",
		duration: 4,
		stacks: { max: 4 },
		grants: [{ kind: "stat", stat: "attackSpeedPercent", amount: 0.32 }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Guinsoo%27s_Rageblade`,
	},
	{
		// Wiki: "At maximum stacks, basic attacks on-attack also grant a Phantom stack for 4 seconds, up
		// to 2 stacks"; the next one spends them (here the third stack), so the 7th attack first (V26.14).
		id: PHANTOM_STACKS,
		source: { kind: "item", itemId: "3124" },
		trigger: { kind: "on-hit", attacksOnly: true },
		requiresMaxStacks: SEETHING_STRIKE,
		listed: false,
		label: "Phantom stacks",
		duration: 4,
		stacks: { max: 3 },
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Guinsoo%27s_Rageblade`,
	},
	{
		// Wiki: "a Phantom Hit that applies on-hit effects to the target after a 0.15-second delay";
		// single-use on-hit effects (a spellblade) are spent by the attack itself.
		id: "guinsoos-rageblade-phantom-hit",
		source: { kind: "item", itemId: "3124" },
		trigger: { kind: "on-max-stacks", effect: PHANTOM_STACKS },
		consumes: PHANTOM_STACKS,
		label: "Phantom Hit",
		delay: { seconds: 0.15, label: "phantom hit" },
		grants: [{ kind: "applyOnHit" }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Guinsoo%27s_Rageblade`,
	},
	{
		// Wiki: ability damage from a non-innate cast instance "generates a stack of Focused Will for 6
		// seconds, stacking up to 4 times", 3% more ability damage each; here one stack per action.
		id: "spear-of-shojin-focused-will",
		source: { kind: "item", itemId: "3161" },
		trigger: { kind: "on-action-damage", abilitiesOnly: true },
		label: "Focused Will",
		duration: 6,
		stacks: { max: 4 },
		grants: [
			{ kind: "damageAmplification", amount: 0.12, abilitiesOnly: true },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Spear_of_Shojin`,
	},
]
