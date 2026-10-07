import { useState } from "react"
import type { CombatState } from "../lib/combat-state"
import type { Combat, MarkerPlace } from "./use-combat"

type Change = {
	message: string
	before: CombatState
	after: CombatState
	/** The marker just added, which the list points out. */
	markerId?: number
}

/** The entry `after` has that `before` hadn't: the marker just added. */
function addedEntryId(before: CombatState, after: CombatState) {
	const ids = new Set(before.entries.map(({ id }) => id))
	return after.entries.find(({ id }) => !ids.has(id))?.id
}

/**
 * Adding or removing a marker with an "Undo" notice. The notice lasts until the combo changes
 * again, so undoing never takes back a later edit.
 */
export function useMarkerUndo(combat: Combat) {
	const [change, setChange] = useState<Change>()
	const current = change?.after === combat.value ? change : undefined

	return {
		notice: current && {
			message: current.message,
			markerId: current.markerId,
		},
		add(effectId: string, place: MarkerPlace) {
			const before = combat.value
			const after = combat.addSituation(effectId, { place })
			setChange({
				message: `Marker added at the ${place}. Move it with its up and down arrows; × removes it.`,
				before,
				after,
				markerId: addedEntryId(before, after),
			})
		},
		remove(id: number) {
			const before = combat.value
			const after = combat.remove(id)
			setChange({
				message: "Marker removed. The steps after it were recalculated.",
				before,
				after,
			})
		},
		undo() {
			if (current) combat.replace(current.before)
			setChange(undefined)
		},
		dismiss: () => setChange(undefined),
	}
}
