import { normalizeSearchText } from "@/lib/normalize-search-text"
import type {
	ChampionRole,
	ChampionSummary,
} from "../../scripts/sync-data/schemas/champion"

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
