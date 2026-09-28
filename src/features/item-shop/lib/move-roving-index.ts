type GridShape = {
	count: number
	columns: number
}

/**
 * The index focus moves to when `key` is pressed on item `index` of a wrapped grid,
 * or `undefined` for keys the grid does not handle. Moves stop at the edges.
 */
export function moveRovingIndex(
	index: number,
	key: string,
	{ count, columns }: GridShape,
) {
	const last = count - 1
	switch (key) {
		case "ArrowLeft":
			return Math.max(index - 1, 0)
		case "ArrowRight":
			return Math.min(index + 1, last)
		case "ArrowUp":
			return index >= columns ? index - columns : index
		case "ArrowDown":
			// The row above a shorter last row moves to its last item.
			return rowOf(index, columns) < rowOf(last, columns)
				? Math.min(index + columns, last)
				: index
		case "Home":
			return 0
		case "End":
			return last
		default:
			return undefined
	}
}

function rowOf(index: number, columns: number) {
	return Math.floor(index / columns)
}
