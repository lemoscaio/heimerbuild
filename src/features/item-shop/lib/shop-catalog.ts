import type { Item } from "@schemas/item"
import { normalizeSearchText } from "@/lib/normalize-search-text"
import { describeToken, type ShopToken } from "./shop-query"

/** A word that types a token, and the name words a suggestion for it also matches. */
export type CatalogTerm = {
	term: string
	token: ShopToken
	words: readonly string[]
}

/** What the search knows about the items: their names and the tokens built from them. */
export type ShopCatalog = {
	/** A word that continues the start of one stays free text ("health potion"). */
	itemNames: readonly string[]
	/** `group:lifeline`, `from:sheen`, `into:trinityforce`, in shop order. */
	terms: readonly CatalogTerm[]
}

export const EMPTY_CATALOG: ShopCatalog = { itemNames: [], terms: [] }

/**
 * The terms of the purchase groups with a label, the components (`from:`) and the items
 * built from components (`into:`).
 */
export function shopCatalog(items: readonly Item[]): ShopCatalog {
	const groups = new Map<string, string>()
	for (const { groupLimits } of items) {
		for (const { group, label } of groupLimits) {
			if (label && !groups.has(group)) groups.set(group, label)
		}
	}
	const tokens: { token: ShopToken; name: string }[] = [
		...[...groups].map(([group, label]) => ({
			token: { kind: "group" as const, group, label },
			name: label,
		})),
		...items
			.filter(({ into }) => into.length)
			.map((item) => ({
				token: { kind: "from" as const, item: itemRef(item) },
				name: item.name,
			})),
		...items
			.filter(({ from }) => from.length)
			.map((item) => ({
				token: { kind: "into" as const, item: itemRef(item) },
				name: item.name,
			})),
	]
	return {
		itemNames: items.map(({ name }) => name),
		terms: tokens.map(({ token, name }) => ({
			term: describeToken(token).term,
			token,
			words: name.split(/\s+/).map(normalizeSearchText).filter(Boolean),
		})),
	}
}

function itemRef({ id, name, icon }: Item) {
	return { id, name, icon }
}
