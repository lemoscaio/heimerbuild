import type { CombatTarget } from "@/lib/combat/combat"
import type { BuildEffect } from "@/lib/effects/effect"
import { combatNames, combatTotals, stepView } from "../lib/combat-view"
import type { Combat } from "./use-combat"

type UseCombatViewOptions = {
	combat: Combat
	target: CombatTarget
	effects: readonly BuildEffect[]
	passiveName: string
}

/** The combo as its tab shows it: each step's card, with the names of what it reports, and the totals. */
export function useCombatView({
	combat,
	target,
	effects,
	passiveName,
}: UseCombatViewOptions) {
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	const { result } = combat
	return {
		steps: combat.steps.map((entry, index) => {
			const step = result?.steps[index]
			return {
				...entry,
				time: step?.time,
				refused: step?.refused,
				view: step && stepView(step, { names, target }),
			}
		}),
		totals: result && combatTotals(result, target),
	}
}
