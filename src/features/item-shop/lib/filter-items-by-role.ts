import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { isBoots } from "./is-boots"

export type RoleFilter = "ALL" | ChampionRole

type RoleItem = Pick<Item, "roles" | "tags" | "groupLimits">

/** Consumables and boots fit every role, whatever shop class Riot gives them. */
function fitsEveryRole(item: RoleItem) {
	return item.tags.includes("Consumable") || isBoots(item)
}

export function filterItemsByRole<T extends RoleItem>(
	items: readonly T[],
	role: RoleFilter,
) {
	return role === "ALL"
		? [...items]
		: items.filter((item) => fitsEveryRole(item) || item.roles.includes(role))
}
