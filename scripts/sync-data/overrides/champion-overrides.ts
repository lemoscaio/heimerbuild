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
export const CHAMPION_OVERRIDES: readonly ChampionOverride[] = []
