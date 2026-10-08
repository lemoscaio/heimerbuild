import { combatTimeline } from "../lib/combat-timeline"
import { combatNames } from "../lib/combat-view"
import type { UseCombatViewOptions } from "./use-combat-view"

/** The combo as a vertical timeline (`combatTimeline`); none while the build loads. */
export function useCombatTimeline({
	combat,
	target,
	effects,
	passiveName,
}: UseCombatViewOptions) {
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	return (
		combat.result && combatTimeline(combat.result, { target, names, effects })
	)
}
