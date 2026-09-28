import type { Champion } from "../../types/champion"
import type { Champions } from "../../types/champions"

// Keeps only letters and digits, so "kaisa" matches "Kai'Sa".
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]/gu

function normalize(text: string) {
	return text.normalize("NFD").toLowerCase().replace(NON_ALPHANUMERIC, "")
}

export function filterChampions(
	champions: Champions,
	search: string,
): Champion[] {
	const query = normalize(search)
	return Object.values(champions).filter((champion) =>
		normalize(champion.name).includes(query),
	)
}
