import type { Champion, ChampionSummary } from "../schemas/champion"
import type { DataOverride, FieldOverride } from "./apply-overrides"
import { CHAMPION_FORMS } from "./champion-forms"
import { CHAMPION_LEVEL_STATES } from "./champion-level-states"
import { CHAMPION_SKILL_RULES } from "./champion-skill-rules"

/** Summary fields are left out so `champions.json` never disagrees with `champions/<key>.json`. */
export type ChampionOverrideField = Exclude<
	keyof Champion,
	keyof ChampionSummary
>

export type ChampionOverride = DataOverride<Champion, ChampionOverrideField>

export function defineChampionOverride<Field extends ChampionOverrideField>({
	championKey,
	...override
}: Omit<FieldOverride<Champion, Field>, "target"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
}): FieldOverride<Champion, Field> {
	return { ...override, target: championKey }
}

/** Fixes for bugs in Riot's champion data, then the level states, forms and skill rules; see "Data overrides" in the README. */
export const CHAMPION_OVERRIDES: readonly ChampionOverride[] = [
	defineChampionOverride({
		id: "gnar-ranged-attack-type",
		championKey: "Gnar",
		field: "attackType",
		since: "16.19",
		reason:
			"CommunityDragon lists both Ranged and Melee for Gnar, so the 175 range fallback picks melee; Mini Gnar, his starting and default form, is ranged",
		source: "https://wiki.leagueoflegends.com/en-us/Gnar",
		apply: () => "ranged" as const,
	}),
	defineChampionOverride({
		id: "viego-no-mana",
		championKey: "Viego",
		field: "stats",
		since: "16.19",
		reason:
			"Viego has no resource (NONE); his 10000 mana is a placeholder in Riot's data",
		source: "https://wiki.leagueoflegends.com/en-us/Viego",
		apply: (stats) => ({ ...stats, mana: { base: 0, perLevel: 0 } }),
	}),
	defineChampionOverride({
		id: "belveth-no-mana",
		championKey: "Belveth",
		field: "stats",
		since: "16.19",
		reason:
			"Bel'Veth has no resource (NONE); her 45 mana is a placeholder in Riot's data",
		source: "https://wiki.leagueoflegends.com/en-us/Bel%27Veth",
		apply: (stats) => ({ ...stats, mana: { base: 0, perLevel: 0 } }),
	}),
	defineChampionOverride({
		id: "briar-frenzy-resource",
		championKey: "Briar",
		field: "resource",
		since: "16.19",
		reason:
			"Riot's data names Briar's resource FURY; her bar is Frenzy, the remaining duration of her frenzy",
		source: "https://wiki.leagueoflegends.com/en-us/Briar",
		apply: () => "FRENZY",
	}),
	defineChampionOverride({
		id: "reksai-fury-resource",
		championKey: "RekSai",
		field: "resource",
		since: "16.19",
		reason: "Riot's data names Rek'Sai's resource RAGE; her bar is Fury",
		source: "https://wiki.leagueoflegends.com/en-us/Rek%27Sai",
		apply: () => "FURY",
	}),
	defineChampionOverride({
		id: "kled-mounted-health",
		championKey: "Kled",
		field: "stats",
		since: "16.19",
		reason:
			"Riot's health is dismounted Kled alone (410); he starts mounted, his default form, and the wiki gives Kled and Skaarl 810 health growing to 3238",
		source: "https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data",
		apply: (stats) => ({
			...stats,
			health: { base: 810, perLevel: 84 + 1000 / 17 },
		}),
	}),
	...CHAMPION_LEVEL_STATES,
	...CHAMPION_FORMS,
	...CHAMPION_SKILL_RULES,
]
