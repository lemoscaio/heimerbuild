import type { BuildEffect } from "@/lib/effects/effect"

/** A "Combo start" chip: an effect with a start cooldown, and whether the combo starts with it ready. */
export type CombatStartChip = {
	id: string
	/** "Electrocute ready". */
	label: string
	ready: boolean
}

/** One chip per effect with a start cooldown (`startCooldownEffects`): ready unless `onCooldown` names it. */
export function combatStartChips(
	effects: readonly BuildEffect[],
	onCooldown: readonly string[],
): CombatStartChip[] {
	return effects.map(({ id, name }) => ({
		id,
		label: `${name} ready`,
		ready: !onCooldown.includes(id),
	}))
}
