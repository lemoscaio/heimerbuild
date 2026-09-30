import type { ChampionStats } from "@schemas/champion"

export const MIN_LEVEL = 1
export const MAX_LEVEL = 18

export type GrowthStat = ChampionStats["health"]

export function assertChampionLevel(level: number): void {
	if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
		throw new RangeError(
			`Champion level must be an integer from ${MIN_LEVEL} to ${MAX_LEVEL}, got ${level}`,
		)
	}
}

/** Multiplier applied to a per-level growth value; formula from issue 19. */
export function growthMultiplier(level: number): number {
	const levelsGained = level - 1
	return levelsGained * (0.7025 + 0.0175 * levelsGained)
}

export function statAtLevel({ base, perLevel }: GrowthStat, level: number) {
	return base + perLevel * growthMultiplier(level)
}
