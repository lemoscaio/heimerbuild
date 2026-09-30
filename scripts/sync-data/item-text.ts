const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	"#39": "'",
	nbsp: " ",
}

/** Decodes the few HTML entities Data Dragon text uses; anything else stays as written. */
export function decodeEntities(text: string): string {
	return text.replace(
		/&(amp|lt|gt|quot|#39|nbsp);/g,
		(_, entity: string) => ENTITIES[entity] ?? "",
	)
}

/**
 * Data Dragon item markup (`<mainText>`, `<passive>`, `<br>`, ...) as plain text:
 * `<br>` and `<li>` become line breaks, every other tag is dropped. The `<stats>`
 * block is removed because the normalized `stats` replace it.
 */
export function itemMarkupToText(markup: string): string {
	const text = markup
		.replace(/<stats>[\s\S]*?<\/stats>/gi, "")
		.replace(/<br\s*\/?>|<li>/gi, "\n")
		.replace(/<[^>]*>/g, "")
	return decodeEntities(text)
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}
