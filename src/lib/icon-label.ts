// Match the fallback text in GameIcon: its font size scales with the tile, so these hold at any size.
const CHARS_PER_LINE = 8
const MAX_LINES = 4

/** The text a tile shows in place of its icon: the name when it wraps into the tile, else its initials. */
export function iconLabel(name: string) {
	const words = name.split(/\s+/).filter(Boolean)
	return wrappedLineCount(words) <= MAX_LINES ? name : initials(words)
}

/** Lines the words take when wrapped greedily; a word longer than a line is hyphenated. */
function wrappedLineCount(words: readonly string[]) {
	let lines = 0
	let lineLength = 0
	for (const word of words) {
		if (lineLength && lineLength + 1 + word.length <= CHARS_PER_LINE) {
			lineLength += 1 + word.length
			continue
		}
		lines += Math.ceil(word.length / CHARS_PER_LINE)
		lineLength = word.length % CHARS_PER_LINE || CHARS_PER_LINE
	}
	return lines
}

function initials(words: readonly string[]) {
	return words
		.map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
		.join("")
		.slice(0, 5)
}
