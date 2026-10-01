import { type Item, STAT_UNITS, type StatKey } from "@schemas/item"
import type { ConditionToken } from "./shop-query"

type ConditionItem = Pick<
	Item,
	"id" | "from" | "active" | "antiHeal" | "groupLimits" | "stats" | "gold"
>

type ConditionOptions = {
	/** Every item, to follow recipes through items the other filters hid. */
	allItems?: readonly ConditionItem[]
}

/** Items that meet every condition (`has:active`, `from:sheen`, `ap>=80`, `gold<=1500`...). */
export function filterItemsByConditions<T extends ConditionItem>(
	items: readonly T[],
	conditions: readonly ConditionToken[],
	{ allItems = items }: ConditionOptions = {},
) {
	if (!conditions.length) return [...items]
	const componentsOf = recipeComponents(allItems)
	return items.filter((item) =>
		conditions.every((condition) => meets(item, condition, componentsOf)),
	)
}

function meets(
	item: ConditionItem,
	condition: ConditionToken,
	componentsOf: (id: string) => ReadonlySet<string>,
) {
	switch (condition.kind) {
		case "has":
			return item[condition.effect]
		case "group":
			return item.groupLimits.some(({ group }) => group === condition.group)
		case "from":
			return componentsOf(item.id).has(condition.item.id)
		case "into":
			return componentsOf(condition.item.id).has(item.id)
		case "statMin":
			return statValue(item, condition.stat) >= condition.min
		case "gold":
			return condition.bound === "max"
				? item.gold.total <= condition.value
				: item.gold.total >= condition.value
	}
}

/** Every item in an item's recipe, at any depth: Trinity Force has Sheen and Long Sword. */
export function recipeComponents(items: readonly Pick<Item, "id" | "from">[]) {
	const byId = new Map(items.map((item) => [item.id, item]))
	const cache = new Map<string, Set<string>>()
	function componentsOf(id: string): ReadonlySet<string> {
		const cached = cache.get(id)
		if (cached) return cached
		const components = new Set<string>()
		cache.set(id, components)
		for (const component of byId.get(id)?.from ?? []) {
			components.add(component)
			for (const nested of componentsOf(component)) components.add(nested)
		}
		return components
	}
	return componentsOf
}

/** The stat as typed in a token: percent stats in percent (0.3 -> 30). */
function statValue(item: Pick<Item, "stats">, stat: StatKey) {
	const value = item.stats[stat] ?? 0
	return STAT_UNITS[stat] === "percent"
		? Math.round(value * 100 * 1000) / 1000
		: value
}
