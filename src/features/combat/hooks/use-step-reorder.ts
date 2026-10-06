import { useState } from "react"

type UseStepReorderOptions = {
	/** The entries' ids, in order. */
	ids: readonly number[]
	onMove: (id: number, to: number) => void
	/** What a screen reader hears after a move: "Q, Blinding Assault is now item 2 of 5". */
	describeMove: (id: number, to: number) => string
}

/** One move button: whether it can move, and what it does. */
export type MoveAction = { disabled: boolean; onClick: () => void }

/**
 * Reorders the combo's entries one place at a time from their "Move up" and "Move down" buttons,
 * and says each move politely. The first entry can't go up, the last can't go down.
 */
export function useStepReorder({
	ids,
	onMove,
	describeMove,
}: UseStepReorderOptions) {
	const [announcement, setAnnouncement] = useState("")

	function move(id: number, to: number) {
		onMove(id, to)
		setAnnouncement(describeMove(id, to))
	}

	return {
		/** The up and down moves of the entry `id`. */
		moves(id: number): { up: MoveAction; down: MoveAction } {
			const index = ids.indexOf(id)
			return {
				up: { disabled: index <= 0, onClick: () => move(id, index - 1) },
				down: {
					disabled: index === -1 || index >= ids.length - 1,
					onClick: () => move(id, index + 1),
				},
			}
		},
		/** The last move, said politely. */
		announcement,
	}
}
