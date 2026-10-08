import type { AttackWindup } from "@schemas/champion"
import type { StatBreakdown } from "../stats/compute-stats"

/**
 * Seconds from an attack's start to its hit at this attack speed (wiki "Attack speed", Windup):
 * baseWindupTime + modifier × (attackTime × percent − baseWindupTime), where baseWindupTime is
 * percent ÷ base attack speed. Never longer than the attack itself.
 */
export function attackWindupTime(
	{ percent, modifier }: AttackWindup,
	attackSpeed: Pick<StatBreakdown, "base" | "total">,
): number {
	const attackTime = 1 / attackSpeed.total
	const baseWindup = percent / attackSpeed.base
	const windup = baseWindup + modifier * (attackTime * percent - baseWindup)
	return Math.min(attackTime, windup)
}
