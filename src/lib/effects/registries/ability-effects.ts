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
]
