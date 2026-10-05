import type { Amount, Effect } from "../effect"
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
function percentLine(label: string): Amount & { by: "rankValue" } {
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
]
