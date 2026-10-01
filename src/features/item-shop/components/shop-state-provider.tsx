import { createContext, use, useRef, useState } from "react"
import type { ShopFilters } from "../lib/shop-query"
import type { ItemSort } from "../lib/sort-items-by-stat"

export type ShopLayout = "compact" | "expanded"

type ShopStateValue = {
	filters: ShopFilters
	setFilters: (filters: ShopFilters) => void
	sort: ItemSort | undefined
	setSort: (sort: ItemSort | undefined) => void
	query: string
	setQuery: (query: string) => void
	/** The layout the shop last rendered in, so a remount in another layout can move focus. */
	lastLayout: React.RefObject<ShopLayout | undefined>
}

const ShopStateContext = createContext<ShopStateValue | null>(null)

export function useShopState() {
	const context = use(ShopStateContext)
	if (!context) {
		throw new Error("useShopState must be used within ShopStateProvider")
	}
	return context
}

const NO_FILTERS: ShopFilters = {
	role: "ALL",
	stats: [],
	match: "all",
	conditions: [],
}

/**
 * The shop's search, filters and sort, above the page's screens: switching between the
 * overview and the expanded shop mounts another screen, and the shop keeps its state.
 */
export function ShopStateProvider({ children }: React.PropsWithChildren) {
	const [filters, setFilters] = useState<ShopFilters>(NO_FILTERS)
	const [sort, setSort] = useState<ItemSort>()
	const [query, setQuery] = useState("")
	const lastLayout = useRef<ShopLayout>(undefined)

	return (
		<ShopStateContext
			value={{
				filters,
				setFilters,
				sort,
				setSort,
				query,
				setQuery,
				lastLayout,
			}}
		>
			{children}
		</ShopStateContext>
	)
}
