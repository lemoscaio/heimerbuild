import type { Champion, SkillRules } from "../schemas/champion"
import type { FieldOverride } from "./apply-overrides"

/** Sets a champion's `skillRules`: an override like the others, so it is logged, ranged by patch and validated. */
export function defineSkillRules({
	championKey,
	skillRules,
	...override
}: Omit<FieldOverride<Champion, "skillRules">, "target" | "field" | "apply"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	skillRules: SkillRules
}): FieldOverride<Champion, "skillRules"> {
	return {
		...override,
		target: championKey,
		field: "skillRules",
		apply: () => skillRules,
	}
}

const WIKI = "https://wiki.leagueoflegends.com/en-us"
const STARTS_WITH_ONE_RANK = { R: 1 }
const R_FROM_LEVEL_1 = { R: [1, 6, 11, 16] }

/** How these champions' skill points differ from the default; Riot's data has only the max ranks. */
export const CHAMPION_SKILL_RULES = [
	defineSkillRules({
		id: "udyr-skill-rules",
		championKey: "Udyr",
		since: "16.19",
		reason:
			"Udyr has no ultimate: Wingborne Storm ranks like a basic ability, one rank every odd level up to 6",
		source: `${WIKI}/Udyr`,
		skillRules: { rankLevels: { R: [1, 3, 5, 7, 9, 11] } },
	}),
	defineSkillRules({
		id: "jayce-skill-rules",
		championKey: "Jayce",
		since: "16.19",
		reason:
			"Jayce begins with Transform and cannot rank it; his points go to Q, W and E (6 ranks each)",
		source: `${WIKI}/Template:Data_Jayce/Transform_Mercury_Hammer`,
		skillRules: { innateRanks: STARTS_WITH_ONE_RANK },
	}),
	defineSkillRules({
		id: "elise-skill-rules",
		championKey: "Elise",
		since: "16.19",
		reason:
			"Elise begins with one rank in Spider Form and can increase it at levels 6, 11 and 16",
		source: `${WIKI}/Template:Data_Elise/Spider_Form_/_Human_Form`,
		skillRules: {
			innateRanks: STARTS_WITH_ONE_RANK,
			rankLevels: R_FROM_LEVEL_1,
		},
	}),
	defineSkillRules({
		id: "nidalee-skill-rules",
		championKey: "Nidalee",
		since: "16.19",
		reason:
			"Nidalee begins with one rank in Aspect of the Cougar and can increase it at levels 6, 11 and 16",
		source: `${WIKI}/Template:Data_Nidalee/Aspect_of_the_Cougar`,
		skillRules: {
			innateRanks: STARTS_WITH_ONE_RANK,
			rankLevels: R_FROM_LEVEL_1,
		},
	}),
	defineSkillRules({
		id: "karma-skill-rules",
		championKey: "Karma",
		since: "16.19",
		reason:
			"Karma begins with one rank in Mantra and can increase it at levels 6, 11 and 16",
		source: `${WIKI}/Template:Data_Karma/Mantra`,
		skillRules: {
			innateRanks: STARTS_WITH_ONE_RANK,
			rankLevels: R_FROM_LEVEL_1,
		},
	}),
	defineSkillRules({
		id: "yuumi-skill-rules",
		championKey: "Yuumi",
		since: "16.19",
		reason:
			"Yuumi starts with a rank in You and Me!, and Prowling Projectile has 6 ranks instead",
		source: `${WIKI}/Template:Data_Yuumi/You_and_Me!`,
		skillRules: { innateRanks: { W: 1 } },
	}),
	defineSkillRules({
		id: "azir-skill-rules",
		championKey: "Azir",
		since: "16.19",
		reason:
			"Arise! is learned at the start of the game with the first skill point",
		source: `${WIKI}/Champion_ability`,
		skillRules: { firstPoint: "W" },
	}),
	defineSkillRules({
		id: "zeri-skill-rules",
		championKey: "Zeri",
		since: "16.19",
		reason:
			"Burst Fire is learned at the start of the game with the first skill point",
		source: `${WIKI}/Champion_ability`,
		skillRules: { firstPoint: "Q" },
	}),
	defineSkillRules({
		id: "shen-skill-rules",
		championKey: "Shen",
		since: "16.19",
		reason: "Spirit's Refuge needs Twilight Assault to be learned first",
		source: `${WIKI}/Champion_ability`,
		skillRules: { requires: { W: ["Q"] } },
	}),
	defineSkillRules({
		id: "xayah-skill-rules",
		championKey: "Xayah",
		since: "16.19",
		reason:
			"Bladecaller needs Double Daggers or Deadly Plumage to be learned first",
		source: `${WIKI}/Champion_ability`,
		skillRules: { requires: { E: ["Q", "W"] } },
	}),
	defineSkillRules({
		id: "zilean-skill-rules",
		championKey: "Zilean",
		since: "16.19",
		reason: "Rewind needs Time Bomb or Time Warp to be learned first",
		source: `${WIKI}/Champion_ability`,
		skillRules: { requires: { W: ["Q", "E"] } },
	}),
	defineSkillRules({
		id: "zyra-skill-rules",
		championKey: "Zyra",
		since: "16.19",
		reason:
			"Rampant Growth needs Deadly Spines or Grasping Roots to be learned first",
		source: `${WIKI}/Champion_ability`,
		skillRules: { requires: { W: ["Q", "E"] } },
	}),
	defineSkillRules({
		id: "aphelios-skill-rules",
		championKey: "Aphelios",
		since: "16.19",
		reason:
			"Aphelios cannot rank abilities: his points raise attack damage, attack speed or lethality, and his abilities rank up by themselves",
		source: `${WIKI}/Template:Data_Aphelios/The_Hitman_and_the_Seer`,
		skillRules: { statPoints: true },
	}),
]
