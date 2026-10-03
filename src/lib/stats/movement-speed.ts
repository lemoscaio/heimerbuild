import { isInPatchRange, type PatchRange } from "@schemas/patch-range"
import type { ComputedStats } from "./compute-stats"

/** Above `from`, the raw speed becomes `raw × ratio + offset`; the pieces meet at each threshold. */
export type SoftCap = { from: number; ratio: number; offset: number }

/** One version of the soft caps and the patches it holds for, like the data overrides. */
export type SoftCapRules = PatchRange & {
	caps: readonly SoftCap[]
	sourceUrl: string
}

export const MOVEMENT_SPEED_SOFT_CAPS: readonly SoftCapRules[] = [
	{
		since: "16.19",
		caps: [
			{ from: 490, ratio: 0.5, offset: 230 },
			{ from: 415, ratio: 0.8, offset: 83 },
			{ from: 220, ratio: 1, offset: 0 },
			{ from: 0, ratio: 0.5, offset: 110 },
			{ from: Number.NEGATIVE_INFINITY, ratio: 0.01, offset: 110 },
		],
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Movement_speed",
	},
]

/** The soft caps in force on `patch` ("16.19.1"); none on a patch no version covers. */
export function softCapsFor(
	patch: string,
	rules: readonly SoftCapRules[] = MOVEMENT_SPEED_SOFT_CAPS,
): readonly SoftCap[] {
	return rules.find((version) => isInPatchRange(patch, version))?.caps ?? []
}

/** The speed the game gives on `patch` for a raw (uncapped) movement speed. */
export function softCapMovementSpeed(raw: number, patch: string): number {
	const cap = softCapsFor(patch).find(({ from }) => raw > from)
	return cap ? raw * cap.ratio + cap.offset : raw
}

/** The totals with `patch`'s movement speed soft caps applied to their raw movement speed. */
export function capMovementSpeed(
	stats: ComputedStats,
	patch: string,
): ComputedStats {
	const { base, total } = stats.movementSpeed
	const capped = softCapMovementSpeed(total, patch)
	return {
		...stats,
		movementSpeed: { base, bonus: capped - base, total: capped },
	}
}
