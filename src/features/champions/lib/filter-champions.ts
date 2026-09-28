import type { ChampionSummary } from "../../../../scripts/sync-data/schemas/champion"

// Keeps only letters and digits, so "kaisa" matches "Kai'Sa".
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]/gu

function normalize(text: string) {
	return text.normalize("NFD").toLowerCase().replace(NON_ALPHANUMERIC, "")
}

export function filterChampions(
	champions: ChampionSummary[],
	search: string,
): ChampionSummary[] {
	const query = normalize(search)
	return champions.filter((champion) =>
		normalize(champion.name).includes(query),
	)
}
