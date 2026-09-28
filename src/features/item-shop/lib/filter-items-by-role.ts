import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import type { Item } from "../../../../scripts/sync-data/schemas/item"

export type RoleFilter = "ALL" | ChampionRole

export function filterItemsByRole(items: readonly Item[], role: RoleFilter) {
	return role === "ALL"
		? [...items]
		: items.filter((item) => item.roles.includes(role))
}
