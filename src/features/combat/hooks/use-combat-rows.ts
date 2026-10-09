import { useState } from "react"
import {
	type CombatRow,
	type CombatRowOrder,
	combatRows,
	type ProcRow,
	procViewOf,
} from "../lib/combat-rows"
import {
	type CombatNames,
	combatNames,
	type ProcView,
	stepView,
} from "../lib/combat-view"
import { type EffectsById, effectsById } from "../lib/hit-placement"
import {
	type CombatListItem,
	type CombatMarkerItem,
	type CombatStepItem,
	type UseCombatViewOptions,
	useCombatView,
} from "./use-combat-view"

/** A step's row: its card's item with its own hits (`view`), when it starts and lands, the running total. */
export type CombatStepRowItem = CombatStepItem & { row?: CombatRow }

export type CombatMarkerRowItem = CombatMarkerItem & { row?: CombatRow }

/** A proc as a row of its own among the steps (issue 429), with the step that triggered it. */
export type CombatProcRowItem = {
	kind: "proc"
	key: string
	proc: ProcView
	row: ProcRow
	from: CombatStepItem
}

export type CombatRowItem =
	| CombatStepRowItem
	| CombatMarkerRowItem
	| CombatProcRowItem

type RowItemsInput = {
	list: readonly CombatListItem[]
	names: CombatNames
	target: UseCombatViewOptions["target"]
	effects: EffectsById
}

/** A row's item: the list's step or marker with the row, its view from the row's placed step. */
function rowItem(
	row: CombatRow,
	{ list, names, target, effects }: RowItemsInput,
): CombatStepRowItem | CombatMarkerRowItem | undefined {
	const item = list[row.index]
	if (!item) return undefined
	if (item.kind === "marker") return { ...item, row }
	return { ...item, view: stepView(row.step, { names, target, effects }), row }
}

/** The rows as items: steps and markers with their rows, each proc with its view and its step. */
function rowItems(
	rows: ReturnType<typeof combatRows>,
	input: RowItemsInput,
): CombatRowItem[] {
	const steps = new Map<number, CombatStepRowItem>()
	return rows.flatMap((row): CombatRowItem[] => {
		if (row.kind === "step") {
			const item = rowItem(row, input)
			if (item?.kind === "step") steps.set(row.index, item)
			return item ? [item] : []
		}
		const from = steps.get(row.index)
		const proc = from?.view && procViewOf(from.view, row)
		if (!from || !proc) return []
		const key = `${from.id}:${proc.effectId}@${proc.time}`
		return [{ kind: "proc", key, proc, row, from }]
	})
}

/**
 * The combo as the expanded screen lists it: one row per step and marker, in hit order or the
 * combo's order (in memory), each proc a row of its own at its land time, and the running total
 * down the rows.
 */
export function useCombatRows(options: UseCombatViewOptions) {
	const { combat, target, effects, passiveName } = options
	const { list, totals } = useCombatView(options)
	const [order, setOrder] = useState<CombatRowOrder>("hit")
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	const input = { list, names, target, effects: effectsById(effects) }
	const rows =
		combat.result &&
		combatRows(combat.result, { target, effects: input.effects, order })

	return {
		items: rows ? rowItems(rows, input) : [...list],
		/** The entries in the combo's order, ungrouped (`useCombatView`'s list). */
		list,
		/** The entries' ids in the combo's order, which the moves follow whatever the order shown. */
		entryIds: list.map(({ id }) => id),
		totals,
		order,
		setOrder,
	}
}
