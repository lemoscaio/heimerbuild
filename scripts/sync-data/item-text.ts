const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	"#39": "'",
	nbsp: " ",
}

/**
 * Data Dragon item markup (`<mainText>`, `<passive>`, `<br>`, ...) as plain text:
 * `<br>` and `<li>` become line breaks, every other tag is dropped. The `<stats>`
 * block is removed because the normalized `stats` replace it.
 */
export function itemMarkupToText(markup: string): string {
	return markup
		.replace(/<stats>[\s\S]*?<\/stats>/gi, "")
		.replace(/<br\s*\/?>|<li>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, entity) => ENTITIES[entity])
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}
