import {
	describeToken,
	filtersFromTokens,
	type ShopFilters,
	type ShopToken,
	tokensFromFilters,
} from "./shop-query"
import { shopStats } from "./shop-stats"

/**
 * The text a chip turns back into when Backspace edits it: its prefix when it takes a value
 * (`group:`, `from:`, `ap>=`, `gold<=`), else its whole term (`antiheal`, `role:tank`, `ap`).
 */
export function chipEditText(token: ShopToken) {
	switch (token.kind) {
		case "group":
		case "from":
		case "into":
			return `${token.kind}:`
		case "statMin": {
			const alias = shopStats.find(({ stat }) => stat === token.stat)
				?.aliases[0]
			return `${alias ?? ""}>=`
		}
		case "gold":
			return token.bound === "max" ? "gold<=" : "gold>="
		default:
			return describeToken(token).term
	}
}

type SearchState = { query: string; filters: ShopFilters }

/**
 * Backspace in an empty search: the last chip leaves the filters and its edit text becomes
 * the query. `edited` is the chip's label, to announce; undefined when there is no chip.
 */
export function editLastChip({ query, filters }: SearchState): SearchState & {
	edited?: string
} {
	const tokens = tokensFromFilters(filters)
	const last = tokens.at(-1)
	if (!last) return { query, filters }
	return {
		query: chipEditText(last),
		filters: filtersFromTokens(tokens.slice(0, -1), filters),
		edited: describeToken(last).label,
	}
}
