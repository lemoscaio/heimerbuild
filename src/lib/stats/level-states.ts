import type { Champion, LevelState } from "@schemas/champion"
import { type FormOptions, formChanges } from "./champion-forms"

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

/** Melee or ranged at `level` in the selected form: Kayle is ranged from level 6, Mega Gnar is melee. */
export function attackTypeAtLevel(
	champion: Pick<Champion, "attackType" | "levelStates" | "forms">,
	level: number,
	{ form }: FormOptions = {},
): Champion["attackType"] {
	const changes = formChanges(champion.forms, form)
	const levelStates = changes ? changes.levelStates : champion.levelStates
	return (
		levelStateAt(levelStates, level).attackType ??
		changes?.attackType ??
		champion.attackType
	)
}
