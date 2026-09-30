type GridShape = {
	/** Items per visual row, top to bottom. Rows may differ: each shop section ends its own last row. */
	rows: readonly number[]
}

/**
 * The index focus moves to when `key` is pressed on item `index` of a wrapped grid,
 * or `undefined` for keys the grid does not handle. Moves stop at the edges.
 */
export function moveRovingIndex(
	index: number,
	key: string,
	{ rows }: GridShape,
) {
	const last = rows.reduce((total, row) => total + row, 0) - 1
	switch (key) {
		case "ArrowLeft":
			return Math.max(index - 1, 0)
		case "ArrowRight":
			return Math.min(index + 1, last)
		case "ArrowUp":
			return moveRow(index, rows, -1)
		case "ArrowDown":
			return moveRow(index, rows, 1)
		case "Home":
			return 0
		case "End":
			return last
		default:
			return undefined
	}
}

/** Same column in the row above or below; a shorter row moves to its last item. */
function moveRow(index: number, rows: readonly number[], step: -1 | 1) {
	let start = 0
	let row = 0
	while (row < rows.length - 1 && index >= start + (rows[row] ?? 0)) {
		start += rows[row] ?? 0
		row++
	}
	const target = rows[row + step]
	if (target === undefined) return index
	const column = index - start
	const targetStart = step === 1 ? start + (rows[row] ?? 0) : start - target
	return targetStart + Math.min(column, target - 1)
}
