type GridOptions = {
	/** Options per row. */
	columns: number
	/** Number of options. */
	count: number
}

/**
 * The option an arrow key, Home or End moves to from `index` in a grid read row by row.
 * Moves stop at the edges; `undefined` for any other key.
 */
export function moveInGrid(
	index: number,
	key: string,
	{ columns, count }: GridOptions,
): number | undefined {
	const last = count - 1
	const clamp = (next: number) => (next < 0 || next > last ? index : next)
	switch (key) {
		case "ArrowRight":
			return clamp(index + 1)
		case "ArrowLeft":
			return clamp(index - 1)
		case "ArrowDown":
			return clamp(index + columns)
		case "ArrowUp":
			return clamp(index - columns)
		case "Home":
			return 0
		case "End":
			return last
		default:
			return undefined
	}
}
