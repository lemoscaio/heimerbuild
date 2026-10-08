import { useState } from "react"
import {
	type CombatRow,
	type CombatRowOrder,
	combatRows,
} from "../lib/combat-rows"
import { combatNames, stepView } from "../lib/combat-view"
import {
	type CombatMarkerItem,
	type CombatStepItem,
	type UseCombatViewOptions,
	useCombatView,
} from "./use-combat-view"

/** A step's row: its card's item with its own hits (`view`), when it starts and lands, the running total. */
export type CombatStepRowItem = CombatStepItem & { row?: CombatRow }

export type CombatMarkerRowItem = CombatMarkerItem & { row?: CombatRow }

export type CombatRowItem = CombatStepRowItem | CombatMarkerRowItem

/**
 * The combo as the expanded screen lists it: one row per step and marker, in hit order or the
 * combo's order (in memory), each with its own hits and the running total down the rows.
 */
export function useCombatRows(options: UseCombatViewOptions) {
	const { combat, target, effects, passiveName } = options
	const { list, totals } = useCombatView(options)
	const [order, setOrder] = useState<CombatRowOrder>("hit")
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	const rows = combat.result && combatRows(combat.result, { target, order })

	const items = rows
		? rows.flatMap((row): CombatRowItem[] => {
				const item = list[row.index]
				if (!item) return []
				if (item.kind === "marker") return [{ ...item, row }]
				return [{ ...item, view: stepView(row.step, { names, target }), row }]
			})
		: list

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
