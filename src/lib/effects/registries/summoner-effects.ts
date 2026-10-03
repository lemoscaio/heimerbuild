import type { Effect } from "../effect"

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
		sourceUrl: `${WIKI}Barrier`,
	},
]
