import type { Effect } from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/** Summoner spell effects; `level` amounts read the spell's synced values (`summoner-spells.json`). */
export const SUMMONER_EFFECTS: readonly Effect[] = [
	{
		id: "ghost",
		source: { kind: "summoner", spellKey: "SummonerHaste" },
		trigger: { kind: "after-use" },
		duration: { by: "level", value: "duration" },
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { by: "level", value: "movespeedmod" },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Ghost`,
	},
	{
		id: "heal",
		source: { kind: "summoner", spellKey: "SummonerHeal" },
		trigger: { kind: "after-use" },
		duration: { by: "level", value: "movespeedduration" },
		grants: [
			{ kind: "heal", amount: { by: "level", value: "totalheal" } },
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { by: "level", value: "movespeed" },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Heal`,
	},
	{
		id: "barrier",
		source: { kind: "summoner", spellKey: "SummonerBarrier" },
		trigger: { kind: "after-use" },
		duration: { by: "level", value: "shieldduration" },
		grants: [
			{ kind: "shield", amount: { by: "level", value: "shieldstrength" } },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Barrier`,
	},
	{
		// The total true damage over 5 s, one fifth per tick, the first right after the cast (wiki).
		id: "ignite",
		source: { kind: "summoner", spellKey: "SummonerDot" },
		trigger: { kind: "after-use" },
		holder: "target",
		duration: { by: "level", value: "dotduration" },
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "amount",
					damageType: "true",
					amount: {
						by: "level",
						value: "tooltiptruedamagecalculation",
						scale: 0.2,
					},
				},
				every: 1,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Ignite`,
	},
]
