// Keeps only letters and digits, so "kaisa" matches "Kai'Sa" and NFD drops the accents.
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]/gu

/** Search form of a name or query: lowercase, no accents, punctuation or spaces. */
export function normalizeSearchText(text: string) {
	return text.normalize("NFD").toLowerCase().replace(NON_ALPHANUMERIC, "")
}
