import { normalizeSearchText } from "@/lib/normalize-search-text"
import type { ChampionSummary } from "../../../../scripts/sync-data/schemas/champion"

export function filterChampions(
	champions: ChampionSummary[],
	search: string,
): ChampionSummary[] {
	const query = normalizeSearchText(search)
	return champions.filter((champion) =>
		normalizeSearchText(champion.name).includes(query),
	)
}
