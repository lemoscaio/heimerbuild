import type { ChampionRole, ChampionSummary } from "@schemas/champion"
import { normalizeSearchText } from "@/lib/normalize-search-text"

type FilterChampionsOptions = {
	/** Keeps only champions with this role among theirs; every role when omitted. */
	role?: ChampionRole
}

export function filterChampions(
	champions: ChampionSummary[],
	search: string,
	{ role }: FilterChampionsOptions = {},
): ChampionSummary[] {
	const query = normalizeSearchText(search)
	return champions.filter(
		(champion) =>
			(!role || champion.roles.includes(role)) &&
			normalizeSearchText(champion.name).includes(query),
	)
}
