import { useState } from "react"
import {
	type CombatRow,
	type CombatRowOrder,
	combatRows,
	outsideRows,
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
import { useProcLayout } from "./use-proc-layout"

/** A step's row: its card's item with its own hits (`view`), when it starts and lands, the running total. */
export type CombatStepRowItem = CombatStepItem & { row?: CombatRow }

export type CombatMarkerRowItem = CombatMarkerItem & { row?: CombatRow }

/** PROTOTYPE (PR 434): a proc as a row of its own among the steps (`?procs=outside`). */
export type CombatProcRowItem = {
	kind: "proc"
	key: string
	proc: ProcView
	row: ProcRow
	/** The step that triggered it. */
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

/** PROTOTYPE (PR 434): the rows with each proc a row of its own at its land time (`outsideRows`). */
function outsideItems(
	rows: readonly CombatRow[],
	input: RowItemsInput & { order: CombatRowOrder },
): CombatRowItem[] {
	return outsideRows(rows, input).flatMap((entry): CombatRowItem[] => {
		if (entry.kind === "item") {
			const item = rowItem(entry.item, input)
			return item ? [item] : []
		}
		const owner = rowItem(entry.owner, input)
		if (owner?.kind !== "step" || !owner.view) return []
		const proc = procViewOf(owner.view, entry.proc)
		if (!proc) return []
		return [
			{
				kind: "proc",
				key: `${owner.id}:${proc.effectId}@${proc.time}`,
				proc,
				row: entry.proc,
				from: owner,
			},
		]
	})
}

/**
 * The combo as the expanded screen lists it: one row per step and marker, in hit order or the
 * combo's order (in memory), each with its own hits and the running total down the rows.
 */
export function useCombatRows(options: UseCombatViewOptions) {
	const { combat, target, effects, passiveName } = options
	const { list, totals } = useCombatView(options)
	const [order, setOrder] = useState<CombatRowOrder>("hit")
	const layout = useProcLayout()
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	const input = { list, names, target, effects: effectsById(effects) }
	const rows =
		combat.result &&
		combatRows(combat.result, { target, effects: input.effects, order })

	const items: CombatRowItem[] = !rows
		? [...list]
		: layout === "outside"
			? outsideItems(rows, { ...input, order })
			: rows.flatMap((row) => rowItem(row, input) ?? [])

	return {
		items,
		/** The entries in the combo's order, ungrouped (`useCombatView`'s list). */
		list,
		/** The entries' ids in the combo's order, which the moves follow whatever the order shown. */
		entryIds: list.map(({ id }) => id),
		totals,
		order,
		setOrder,
	}
}
