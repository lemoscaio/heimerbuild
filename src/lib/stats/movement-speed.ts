import type { ComputedStats } from "./compute-stats"

/** Above `from`, the raw speed becomes `raw × ratio + offset`; the pieces meet at each threshold. */
type SoftCap = { from: number; ratio: number; offset: number }

/** League of Legends Wiki, "Movement speed", Soft caps; checked 2026-10-03. */
export const MOVEMENT_SPEED_SOFT_CAPS_SOURCE =
	"https://wiki.leagueoflegends.com/en-us/Movement_speed"

const SOFT_CAPS: readonly SoftCap[] = [
	{ from: 490, ratio: 0.5, offset: 230 },
	{ from: 415, ratio: 0.8, offset: 83 },
	{ from: 220, ratio: 1, offset: 0 },
	{ from: 0, ratio: 0.5, offset: 110 },
	{ from: Number.NEGATIVE_INFINITY, ratio: 0.01, offset: 110 },
]

/** The speed the game gives for a raw (uncapped) movement speed. */
export function softCapMovementSpeed(raw: number): number {
	const cap = SOFT_CAPS.find(({ from }) => raw > from)
	return cap ? raw * cap.ratio + cap.offset : raw
}

/** The totals with the movement speed soft caps applied to their raw movement speed. */
export function capMovementSpeed(stats: ComputedStats): ComputedStats {
	const { base, total } = stats.movementSpeed
	const capped = softCapMovementSpeed(total)
	return {
		...stats,
		movementSpeed: { base, bonus: capped - base, total: capped },
	}
}
