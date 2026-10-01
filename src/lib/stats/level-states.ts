import type { Champion, LevelState } from "@schemas/champion"

export type ActiveLevelState = Omit<LevelState, "fromLevel">

/** The champion's level states reached at `level`, merged: a later state's fields replace an earlier one's. */
export function levelStateAt(
	levelStates: Champion["levelStates"],
	level: number,
): ActiveLevelState {
	let active: ActiveLevelState = {}
	for (const { fromLevel, ...fields } of levelStates ?? []) {
		if (fromLevel > level) break
		active = { ...active, ...fields }
	}
	return active
}

/** Melee or ranged at `level`: Kayle is ranged from level 6. */
export function attackTypeAtLevel(
	champion: Pick<Champion, "attackType" | "levelStates">,
	level: number,
): Champion["attackType"] {
	return (
		levelStateAt(champion.levelStates, level).attackType ?? champion.attackType
	)
}
