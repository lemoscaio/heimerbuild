import type { Champion, LevelState } from "../schemas/champion"
import type { FieldOverride } from "./apply-overrides"

/** Sets a champion's `levelStates`: an override like the others, so it is logged, ranged by patch and validated. */
export function defineLevelStates({
	championKey,
	levelStates,
	...override
}: Omit<
	FieldOverride<Champion, "levelStates">,
	"target" | "field" | "apply"
> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	levelStates: LevelState[]
}): FieldOverride<Champion, "levelStates"> {
	return {
		...override,
		target: championKey,
		field: "levelStates",
		apply: () => levelStates,
	}
}

/** Stats that change with the level alone; Riot's data has only the level 1 values. */
export const CHAMPION_LEVEL_STATES = [
	defineLevelStates({
		id: "gnar-level-states",
		championKey: "Gnar",
		since: "16.19",
		reason:
			"Mini Gnar's innate adds 225 to 325 bonus attack range, linear by level: 400 at level 1, 500 at 18",
		source:
			"https://wiki.leagueoflegends.com/en-us/Template:Data_Gnar/Mini_Gnar",
		levelStates: [
			{
				fromLevel: 1,
				attackRange: { base: 400, perLevel: 100 / 17, growth: "linear" },
			},
		],
	}),
	defineLevelStates({
		id: "kayle-level-states",
		championKey: "Kayle",
		since: "16.19",
		reason:
			"Divine Ascent makes Kayle ranged with 525 attack range at level 6, and 625 at level 16",
		source:
			"https://wiki.leagueoflegends.com/en-us/Template:Data_Kayle/Divine_Ascent",
		levelStates: [
			{
				fromLevel: 6,
				attackType: "ranged",
				attackRange: { base: 525, perLevel: 0 },
			},
			{ fromLevel: 16, attackRange: { base: 625, perLevel: 0 } },
		],
	}),
	defineLevelStates({
		id: "tristana-level-states",
		championKey: "Tristana",
		since: "16.19",
		reason:
			"Draw a Bead adds 0 to 150 bonus attack range, linear by level: 550 at level 1, 700 at 18",
		source:
			"https://wiki.leagueoflegends.com/en-us/Template:Data_Tristana/Draw_a_Bead",
		levelStates: [
			{
				fromLevel: 1,
				attackRange: { base: 550, perLevel: 150 / 17, growth: "linear" },
			},
		],
	}),
]
