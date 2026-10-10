import type { CombatResult, CombatTarget } from "@/lib/combat/combat"
import {
	type CombatRow,
	type CombatRowOrder,
	combatRows,
	type ProcRow,
	procViewOf,
} from "./combat-rows"
import {
	type CombatNames,
	type ProcView,
	type StepView,
	stepView,
} from "./combat-view"
import type { EffectsById } from "./hit-placement"

export type StepRowView = { kind: "step"; row: CombatRow; view: StepView }

export type ProcRowView = { kind: "proc"; row: ProcRow; view: ProcView }

/** A row of the combo with what its card or row shows. */
export type CombatRowView = StepRowView | ProcRowView

type CombatRowViewsOptions = {
	target: CombatTarget
	effects: EffectsById
	names: CombatNames
	order: CombatRowOrder
}

/**
 * The rows both combo views show (`combatRows`, markers included), each with its view. A step's view
 * comes from its row's step, so its health is the row's: what landed down to it in the order shown.
 */
export function combatRowViews(
	result: Pick<CombatResult, "steps">,
	{ target, effects, names, order }: CombatRowViewsOptions,
): CombatRowView[] {
	const views = new Map<number, StepView>()
	return combatRows(result, { target, effects, order }).flatMap(
		(row): CombatRowView[] => {
			if (row.kind === "step") {
				const view = stepView(row.step, { names, target, effects })
				views.set(row.index, view)
				return [{ kind: "step", row, view }]
			}
			const owner = views.get(row.index)
			const view = owner && procViewOf(owner, row)
			return view ? [{ kind: "proc", row, view }] : []
		},
	)
}
