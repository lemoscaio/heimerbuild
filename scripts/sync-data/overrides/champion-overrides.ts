import type { Champion, ChampionSummary } from "../schemas/champion"
import type { DataOverride, FieldOverride } from "./apply-overrides"

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

/** Fixes for bugs in Riot's champion data; see "Data overrides" in the README. */
export const CHAMPION_OVERRIDES: readonly ChampionOverride[] = [
	defineChampionOverride({
		id: "gnar-ranged-attack-type",
		championKey: "Gnar",
		field: "attackType",
		since: "16.19",
		reason:
			"CommunityDragon lists both Ranged and Melee for Gnar, so the 175 range fallback picks melee; Mini Gnar, his starting form, is ranged",
		source: "https://wiki.leagueoflegends.com/en-us/Gnar",
		apply: () => "ranged" as const,
	}),
	defineChampionOverride({
		id: "gnar-attack-range-growth",
		championKey: "Gnar",
		field: "stats",
		since: "16.19",
		reason:
			"Mini Gnar's attack range grows from 175 to 275, but Riot's data has no range growth",
		source: "https://wiki.leagueoflegends.com/en-us/Gnar",
		apply: (stats) => ({
			...stats,
			attackRange: { ...stats.attackRange, perLevel: 5.882 },
		}),
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
		id: "kled-mounted-health",
		championKey: "Kled",
		field: "stats",
		since: "16.19",
		reason:
			"Riot's health is dismounted Kled alone (410); he starts mounted, with Kled and Skaarl's 810 total health. Interim choice until his forms are modeled",
		source: "https://github.com/lemoscaio/heimerbuild/issues/177",
		apply: (stats) => ({ ...stats, health: { base: 810, perLevel: 142.82 } }),
	}),
]
