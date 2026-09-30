import { decodeEntities } from "./item-text"
import type { RichText, TextSpan } from "./schemas/rune"

type TagRole = "break" | "listItem" | "strong" | "italic"

/**
 * The only tags that keep a meaning (keys are lowercase). Every other tag, such as `<font>`,
 * `<scaleAD>` or `<lol-uikit-tooltipped-keyword>`, is dropped and its text kept.
 */
const TAG_ROLES: Readonly<Record<string, TagRole>> = {
	br: "break",
	hr: "break",
	li: "listItem",
	b: "strong",
	keywordmajor: "strong",
	i: "italic",
	rules: "italic",
}

const LIST_BULLET = "• "

type Line = TextSpan[]

const TOKEN = /<(\/?)([a-z][\w-]*)[^>]*>|[^<]+|</gi

function spanStyle(strongDepth: number, italicDepth: number) {
	return {
		...(strongDepth > 0 && { strong: true as const }),
		...(italicDepth > 0 && { italic: true as const }),
	}
}

function sameStyle(a: TextSpan, b: TextSpan): boolean {
	return a.strong === b.strong && a.italic === b.italic
}

/** Collapses whitespace across the spans of a line, trims it and merges spans that look the same. */
function tidyLine(line: Line): Line {
	const tidy: Line = []
	let afterSpace = true
	for (const span of line) {
		let text = span.text.replace(/\s+/g, " ")
		if (afterSpace) text = text.trimStart()
		if (!text) continue
		afterSpace = text.endsWith(" ")
		const previous = tidy.at(-1)
		if (previous && sameStyle(previous, span)) {
			tidy[tidy.length - 1] = { ...previous, text: previous.text + text }
		} else {
			tidy.push({ ...span, text })
		}
	}
	const last = tidy.at(-1)
	if (last) {
		const text = last.text.trimEnd()
		if (text) tidy[tidy.length - 1] = { ...last, text }
		else tidy.pop()
	}
	return tidy
}

/** Blank lines separate paragraphs; runs of them count as one. */
function toParagraphs(lines: Line[]): RichText {
	const paragraphs: RichText = []
	let paragraph: Line[] = []
	for (const line of lines.map(tidyLine)) {
		if (line.length) {
			paragraph.push(line)
		} else if (paragraph.length) {
			paragraphs.push(paragraph)
			paragraph = []
		}
	}
	if (paragraph.length) paragraphs.push(paragraph)
	return paragraphs
}

/**
 * Data Dragon rune markup as rich text data: `<br>`, `<hr>` and `<li>` start lines, `<b>` and
 * `<i>` (plus their look-alikes in `TAG_ROLES`) become `strong` and `italic`, and nothing
 * else survives, so the app never renders markup from the data.
 */
export function runeMarkupToRichText(markup: string): RichText {
	const lines: Line[] = [[]]
	let strongDepth = 0
	let italicDepth = 0

	for (const [token, closing, tagName] of markup.matchAll(TOKEN)) {
		const role = tagName ? TAG_ROLES[tagName.toLowerCase()] : undefined
		if (tagName === undefined) {
			lines.at(-1)?.push({
				text: decodeEntities(token),
				...spanStyle(strongDepth, italicDepth),
			})
		} else if (role === "break" && !closing) {
			lines.push([])
		} else if (role === "listItem" && !closing) {
			lines.push([{ text: LIST_BULLET }])
		} else if (role === "strong") {
			strongDepth = Math.max(0, strongDepth + (closing ? -1 : 1))
		} else if (role === "italic") {
			italicDepth = Math.max(0, italicDepth + (closing ? -1 : 1))
		}
	}

	return toParagraphs(lines)
}
