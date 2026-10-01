type TextPart = { text: string; isNumber: boolean }

// A number with an optional sign, decimals, percent and range: "+9", "0.45%", "70 - 240", "1.8-4".
const NUMBER = /[+-]?\d+(?:\.\d+)?%?(?:\s?[-–]\s?\d+(?:\.\d+)?%?)?/g

/** Splits text around its numbers, so a description can emphasize them. */
export function splitNumbers(text: string): TextPart[] {
	const parts: TextPart[] = []
	let index = 0
	for (const match of text.matchAll(NUMBER)) {
		if (match.index > index) {
			parts.push({ text: text.slice(index, match.index), isNumber: false })
		}
		parts.push({ text: match[0], isNumber: true })
		index = match.index + match[0].length
	}
	if (index < text.length) {
		parts.push({ text: text.slice(index), isNumber: false })
	}
	return parts
}
