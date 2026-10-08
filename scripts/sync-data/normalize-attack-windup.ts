import { z } from "zod"
import type { AttackWindup } from "./schemas/champion"

/** The windup percent of a champion whose attack data sets neither field (wiki: 0.3 + offset). */
const DEFAULT_WINDUP_PERCENT = 0.3

// Game files omit fields left at their default value. Senna's level-based
// `mOverrideAutoattackCastTime` is not read: her attack keeps `mAttackCastTime`.
export const basicAttackSchema = z.object({
	mAttackDelayCastOffsetPercent: z.number().optional(),
	mAttackCastTime: z.number().optional(),
	mAttackTotalTime: z.number().optional(),
	mAttackDelayCastOffsetPercentAttackSpeedRatio: z.number().optional(),
})

export type BasicAttack = z.infer<typeof basicAttackSchema>

function round(value: number): number {
	// CommunityDragon stores float32 values (0.10000000149011612).
	return Math.round(value * 10_000) / 10_000
}

/**
 * The champion's attack windup from its CommunityDragon `basicAttack` (wiki "Attack speed",
 * Windup): `mAttackCastTime` ÷ `mAttackTotalTime` when the attack has them, else 0.3 +
 * `mAttackDelayCastOffsetPercent`; the modifier is `mAttackDelayCastOffsetPercentAttackSpeedRatio`
 * (1 by default). Throws on a cast time without a total time or the reverse.
 */
export function normalizeAttackWindup(
	basicAttack: BasicAttack | undefined,
): AttackWindup {
	const {
		mAttackCastTime: castTime,
		mAttackTotalTime: totalTime,
		mAttackDelayCastOffsetPercent: offset = 0,
		mAttackDelayCastOffsetPercentAttackSpeedRatio: modifier = 1,
	} = basicAttack ?? {}
	if ((castTime === undefined) !== (totalTime === undefined)) {
		throw new Error(
			"basicAttack has only one of mAttackCastTime and mAttackTotalTime",
		)
	}
	const percent =
		castTime !== undefined && totalTime !== undefined
			? castTime / totalTime
			: DEFAULT_WINDUP_PERCENT + offset
	return { percent: round(percent), modifier: round(modifier) }
}
