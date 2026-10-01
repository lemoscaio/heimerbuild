import { type FilterShortcut, filterShortcuts } from "./filter-shortcuts"
import {
	applyShopTokens,
	type ConditionToken,
	describeToken,
	type ShopFilters,
} from "./shop-query"

/** A row of the "More filters" menu: a filter that applies as it is, or one to complete. */
export type MoreFilter =
	| { kind: "token"; token: ConditionToken; label: string; example: string }
	| ({ kind: "shortcut" } & FilterShortcut)

const statMin: FilterShortcut = {
	text: "ap>=",
	label: "Stat at least",
	kindLabel: "Stat",
	example: "ap>=80",
}

const readyTokens: readonly ConditionToken[] = [
	{ kind: "has", effect: "active" },
	{ kind: "has", effect: "antiHeal" },
]

/** The menu's rows: the filters that apply as they are, then the ones that need a value. */
export const moreFilters: {
	ready: readonly MoreFilter[]
	withValue: readonly MoreFilter[]
} = {
	ready: readyTokens.map((token) => {
		const { label, term } = describeToken(token)
		return { kind: "token", token, label, example: term }
	}),
	withValue: [...filterShortcuts, statMin].map((shortcut) => ({
		kind: "shortcut",
		...shortcut,
	})),
}

type ShopSearchState = { query: string; filters: ShopFilters }

/** The search after a menu pick: a filter joins the chips, a shortcut ends the text. */
export function applyMoreFilter(
	filter: MoreFilter,
	{ query, filters }: ShopSearchState,
): ShopSearchState {
	if (filter.kind === "token") {
		return { query, filters: applyShopTokens(filters, [filter.token]) }
	}
	const text = query.trim()
	return { query: text ? `${text} ${filter.text}` : filter.text, filters }
}
