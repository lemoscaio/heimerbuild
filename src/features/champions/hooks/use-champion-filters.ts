import type { ChampionRole } from "@schemas/champion"
import { useState } from "react"

/** The home page's search text and role chip, shared by the grid and the recent builds. */
export function useChampionFilters() {
	const [search, setSearch] = useState("")
	const [role, setRole] = useState<ChampionRole>()
	return { search, setSearch, role, setRole }
}

export type ChampionFilters = ReturnType<typeof useChampionFilters>
