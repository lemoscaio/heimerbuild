import { useState } from "react"
import { blockMove } from "../lib/combat-sequence"

type UseStepReorderOptions = {
	/** The entries' ids, in order. */
	entryIds: readonly number[]
	/** Moves the entries `ids`, kept together, to position `to`. */
	onMove: (ids: readonly number[], to: number) => void
	/** What a screen reader hears after a move: "Q, Blinding Assault is now item 2 of 5". */
	describeMove: (
		ids: readonly number[],
		place: { at: number; of: number },
	) => string
}

/** One move button: whether it can move, and what it does. */
export type MoveAction = { disabled: boolean; onClick: () => void }

/**
 * Reorders the combo's entries one place at a time from their "Move up" and "Move down" buttons,
 * or to the first place, and says each move politely. A block (a step, a marker, a whole group)
 * moves past its whole neighbour among `blocks`; the first can't go up, the last can't go down.
 */
export function useStepReorder({
	entryIds,
	onMove,
	describeMove,
}: UseStepReorderOptions) {
	const [announcement, setAnnouncement] = useState("")

	function action(
		blocks: readonly (readonly number[])[],
		position: number,
		direction: "up" | "down" | "start",
	): MoveAction {
		const move = blockMove(entryIds, blocks, { position, direction })
		return {
			disabled: !move,
			onClick: () => {
				if (!move) return
				onMove(move.ids, move.to)
				setAnnouncement(
					describeMove(move.ids, { at: move.position, of: blocks.length }),
				)
			},
		}
	}

	return {
		/** The up and down moves of the block at `position` among `blocks`. */
		moves(
			blocks: readonly (readonly number[])[],
			position: number,
		): { up: MoveAction; down: MoveAction } {
			return {
				up: action(blocks, position, "up"),
				down: action(blocks, position, "down"),
			}
		},
		/** The move of the block at `position` to the first place among `blocks` (issue 344). */
		toStart: (blocks: readonly (readonly number[])[], position: number) =>
			action(blocks, position, "start"),
		/** The last move, said politely. */
		announcement,
	}
}
