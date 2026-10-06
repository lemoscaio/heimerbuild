import { useState } from "react"
import type { CombatState } from "../lib/combat-state"
import type { Combat } from "./use-combat"

type Change = {
	message: string
	before: CombatState
	after: CombatState
	/** The marker just added, which the list points out. */
	markerId?: number
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
		add(effectId: string) {
			const before = combat.value
			const after = combat.addSituation(effectId)
			setChange({
				message:
					"Marker added at the end. Move it with its up and down arrows; × removes it.",
				before,
				after,
				markerId: after.entries.at(-1)?.id,
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
