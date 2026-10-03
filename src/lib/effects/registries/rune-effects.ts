import type { Effect } from "../effect"

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
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Nimbus_Cloak",
	},
]
