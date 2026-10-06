import type { Effect, LevelStep } from "../effect"
import { VERIFIED_ON } from "./verified-on"

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
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Hail_of_Blades",
	},
]
