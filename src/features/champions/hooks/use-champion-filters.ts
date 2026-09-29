import { useState } from "react"
import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"

/** The home page's search text and role chip, shared by the grid and the recent builds. */
export function useChampionFilters() {
	const [search, setSearch] = useState("")
	const [role, setRole] = useState<ChampionRole>()
	return { search, setSearch, role, setRole }
}

export type ChampionFilters = ReturnType<typeof useChampionFilters>
