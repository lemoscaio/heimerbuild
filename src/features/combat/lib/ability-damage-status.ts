import type { AbilityDamage } from "@schemas/champion"

/** How much of an ability's damage the combo can count: all, some, none of it, or it deals none. */
export type DamageStatus = "modeled" | "partial" | "not-modeled" | "none"

export function damageStatus(
	damage: readonly AbilityDamage[] | undefined,
): DamageStatus {
	if (!damage?.length) return "none"
	const modeled = damage.filter(({ notModeled }) => !notModeled).length
	if (modeled === damage.length) return "modeled"
	return modeled ? "partial" : "not-modeled"
}
