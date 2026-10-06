import type {
	Amount,
	Effect,
	MarkApplication,
	RankValueAmount,
} from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/Template:Data_"
const MOVE_QUICK = `${WIKI}Teemo/Move_Quick`
/** The active doubles the passive's speed and stands in for it while it lasts. */
const MOVE_QUICK_STACKING = { group: "teemo-w-speed", rule: "replace" } as const
const MOVE_QUICK_SPEED: Amount = {
	by: "rank",
	rankStat: "movementSpeedPercent",
}

/** A percent tooltip line of the ability, as a fraction: "Armor" 10 to 30 (%) is 0.1 to 0.3. */
function percentLine(label: string): RankValueAmount {
	return { by: "rankValue", label, scale: 0.01 }
}

/** Hammer Stance armor and magic resist: 5 to 26 at levels 1, 6, 11 and 16 (wiki), plus 7.5% bonus AD. */
const HAMMER_RESIST_STEPS: Amount = {
	by: "championLevel",
	steps: [
		{ from: 1, value: 5 },
		{ from: 6, value: 12 },
		{ from: 11, value: 19 },
		{ from: 16, value: 26 },
	],
}
const HAMMER_RESIST_FROM_AD: Amount = {
	by: "stat",
	stat: "attackDamage",
	part: "bonus",
	ratio: 0.075,
}

const HARRIER = "quinn-harrier"
const HARRIER_MARK = {
	mark: HARRIER,
	duration: 4,
	consumedBy: ["attack"],
} as const satisfies MarkApplication
const ESSENCE_FLUX = "ezreal-w"

/**
 * Champions' ability effects; their numbers are the synced rank stats and tooltip lines they read.
 * An `always` one is a passive the champion always has, shown without a switch.
 */
export const ABILITY_EFFECTS: readonly Effect[] = [
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
		id: "malphite-w-passive",
		source: { kind: "ability", championKey: "Malphite", slot: "W" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "armor",
				amount: { by: "stat", stat: "armor", ratio: percentLine("Armor") },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Malphite/Thunderclap`,
	},
	{
		id: "taric-w-passive",
		source: { kind: "ability", championKey: "Taric", slot: "W" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "armor",
				amount: {
					by: "stat",
					stat: "armor",
					ratio: percentLine("Passive Armor"),
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Taric/Bastion`,
	},
	{
		id: "dr-mundo-e-passive",
		source: { kind: "ability", championKey: "DrMundo", slot: "E" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: {
					by: "stat",
					stat: "health",
					ratio: percentLine("Health Into Attack Damage"),
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Dr._Mundo/Blunt_Force_Trauma`,
	},
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
	{
		// Riot's tooltip calls the most bonus AD "Maximum Damage".
		id: "tryndamere-q-passive",
		source: { kind: "ability", championKey: "Tryndamere", slot: "Q" },
		trigger: { kind: "always" },
		part: "passive",
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: {
					by: "missingHealth",
					max: { by: "rankValue", label: "Maximum Damage" },
					fullAt: 90,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Tryndamere/Bloodlust`,
	},
	{
		id: "jayce-hammer-stance",
		source: { kind: "ability", championKey: "Jayce", slot: "R" },
		form: "hammer",
		trigger: { kind: "always" },
		grants: [
			{ kind: "stat", stat: "armor", amount: HAMMER_RESIST_STEPS },
			{ kind: "stat", stat: "magicResist", amount: HAMMER_RESIST_STEPS },
			{ kind: "stat", stat: "armor", amount: HAMMER_RESIST_FROM_AD },
			{ kind: "stat", stat: "magicResist", amount: HAMMER_RESIST_FROM_AD },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jayce/Transform_Mercury_Hammer`,
	},
	{
		id: "shyvana-r-dragon-form",
		source: { kind: "ability", championKey: "Shyvana", slot: "R" },
		form: "dragon",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "rankValue", label: "Bonus Health" },
			},
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Attack Range" },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Shyvana/Dragon%27s_Descent`,
	},
	{
		// Fishbones keeps 90% of Jinx's bonus attack speed (wiki; not in the tooltip).
		id: "jinx-q-rockets",
		source: { kind: "ability", championKey: "Jinx", slot: "Q" },
		form: "rockets",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Rocket Bonus Range" },
			},
			{ kind: "attackSpeedMultiplier", of: "bonus", amount: -0.1 },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
	{
		// The tooltip line is the 3 stacks' bonus attack speed; each lasts 2.5 s (wiki).
		id: "jinx-q-revd-up",
		source: { kind: "ability", championKey: "Jinx", slot: "Q" },
		form: "minigun",
		label: "Rev'd up",
		trigger: { kind: "on-hit" },
		duration: 2.5,
		stacks: { max: 3 },
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Minigun Total Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
	{
		// The 150% bonus AD and AP health ratios are the wiki's; the tooltip has the base only.
		id: "belveth-r-true-form",
		source: { kind: "ability", championKey: "Belveth", slot: "R" },
		form: "true-form",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "rankValue", label: "Bonus Health" },
			},
			{
				kind: "stat",
				stat: "health",
				amount: {
					by: "stat",
					stat: "attackDamage",
					part: "bonus",
					ratio: 1.5,
				},
			},
			{
				kind: "stat",
				stat: "health",
				amount: { by: "stat", stat: "abilityPower", ratio: 1.5 },
			},
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Range" },
			},
			{
				kind: "attackSpeedMultiplier",
				of: "total",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Bel%27Veth/Endless_Banquet`,
	},
	// Udyr's stance buffs add up: "Switching Stances will not cause any additional effects granted by
	// the previous one to end prematurely" (wiki, Udyr). Awaken's level-scaled extras are left out.
	{
		id: "udyr-q-active",
		source: { kind: "ability", championKey: "Udyr", slot: "Q" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Udyr/Wilding_Claw`,
	},
	{
		// The life steal holds for the next two attacks; the shield ratios are the wiki's.
		id: "udyr-w-active",
		source: { kind: "ability", championKey: "Udyr", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{ kind: "shield", amount: { by: "rankValue", label: "Shield Amount" } },
			{
				kind: "shield",
				amount: { by: "stat", stat: "attackDamage", part: "bonus", ratio: 0.5 },
			},
			{
				kind: "shield",
				amount: { by: "stat", stat: "abilityPower", ratio: 0.4 },
			},
			{
				kind: "shield",
				amount: {
					by: "stat",
					stat: "health",
					ratio: percentLine("% Health Shield"),
				},
			},
			{
				kind: "stat",
				stat: "lifeStealPercent",
				amount: percentLine("Life Steal"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Udyr/Iron_Mantle`,
	},
	{
		// Its peak: the speed decays to 30% over the last 1.5 s.
		id: "udyr-e-active",
		source: { kind: "ability", championKey: "Udyr", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				// 5% per 100 bonus AD.
				amount: {
					by: "stat",
					stat: "attackDamage",
					part: "bonus",
					ratio: 0.0005,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Udyr/Blazing_Stampede`,
	},
	{
		// While in the mist, 8 s; attacking or casting drops the speed (and camouflage) for 1 s.
		id: "viego-e-active",
		source: { kind: "ability", championKey: "Viego", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 8,
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
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				// 4% per 100 AP.
				amount: { by: "stat", stat: "abilityPower", ratio: 0.0004 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Viego/Harrowed_Path`,
	},
	{
		// Attacking or casting anything but Savagery ends it (wiki).
		id: "rengar-r-active",
		source: { kind: "ability", championKey: "Rengar", slot: "R" },
		trigger: { kind: "after-use" },
		duration: { by: "rankValue", label: "Duration" },
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Rengar/Thrill_of_the_Hunt`,
	},
	{
		// No bonus when Hop transforms Gnar (wiki), so only as Mini Gnar.
		id: "gnar-e-active",
		source: { kind: "ability", championKey: "Gnar", slot: "E" },
		form: "mini",
		trigger: { kind: "after-use" },
		duration: 6,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Bonus Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Gnar/Hop`,
	},
	{
		// Its peak: the speed decays over 3 s. GNAR!'s passive raises it; 20% before R has a point (wiki).
		id: "gnar-w-hyper",
		source: { kind: "ability", championKey: "Gnar", slot: "W" },
		form: "mini",
		trigger: { kind: "on-hit" },
		stacks: { max: 3 },
		duration: 3,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: {
					...percentLine("Hyper Move Speed"),
					slot: "R",
					unranked: 0.2,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Gnar/Hyper`,
	},
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
	{
		// Every 12 s (from the attack that spends it) the next attack deals the synced bonus damage (wiki).
		id: "ziggs-short-fuse",
		source: { kind: "ability", championKey: "Ziggs", slot: "passive" },
		trigger: { kind: "periodic" },
		duration: Number.POSITIVE_INFINITY,
		endsOn: "on-hit",
		cooldown: 12,
		reducedOnCast: {
			by: "championLevel",
			steps: [
				{ from: 1, value: 4 },
				{ from: 7, value: 5 },
				{ from: 13, value: 6 },
			],
		},
		start: { kind: "running" },
		grants: [
			{ kind: "abilityDamage", ability: "passive", name: "TotalDamage" },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Ziggs/Short_Fuse`,
	},
]
