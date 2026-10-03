import type { Effect } from "../effect"
import { VERIFIED_ON } from "./verified-on"

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
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Nimbus_Cloak",
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
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Gathering_Storm",
	},
]
