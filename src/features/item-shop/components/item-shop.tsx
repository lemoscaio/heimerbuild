import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { LoadError } from "@/components/common/load-error"
import { useItems } from "@/data/hooks/use-items"
import { track } from "@/lib/analytics/analytics"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { useDebouncedCallback } from "../hooks/use-debounced-callback"
import { focusRovingTabStop } from "../hooks/use-roving-focus"
import { filterItemsByName } from "../lib/filter-items-by-name"
import {
	filterItemsByRole,
	type RoleFilter as Role,
} from "../lib/filter-items-by-role"
import {
	filterItemsByStats,
	type StatMatch,
} from "../lib/filter-items-by-stats"
import { type ItemSort, sortItemsByStat } from "../lib/sort-items-by-stat"
import { ItemGrid } from "./item-grid"
import { ItemGridSkeleton } from "./item-grid-skeleton"
import { ItemList } from "./item-list"
import { ItemSearch } from "./item-search"
import { RoleFilter } from "./role-filter"
import { StatFilter } from "./stat-filter"
import { StatMatchToggle } from "./stat-match-toggle"
import { StatSort } from "./stat-sort"

type ItemShopProps = {
	patch: string
	onItemClick: (itemId: string) => void
}

export function ItemShop({ patch, onItemClick }: ItemShopProps) {
	const itemsQuery = useItems(patch)
	const [role, setRole] = useState<Role>("ALL")
	const [stats, setStats] = useState<StatKey[]>([])
	const [match, setMatch] = useState<StatMatch>("all")
	const [sort, setSort] = useState<ItemSort>()
	const [query, setQuery] = useState("")
	const listRef = useRef<HTMLElement>(null)
	const trackSearch = useDebouncedCallback(
		(queryLength: number) => track("shop_searched", { queryLength }),
		SEARCH_TRACK_DELAY_MS,
	)

	const filteredItems = itemsQuery.data
		? filterItemsByStats(
				filterItemsByName(
					filterItemsByRole(Object.values(itemsQuery.data), role),
					query,
				),
				stats,
				{ match },
			)
		: []
	const items = sort ? sortItemsByStat(filteredItems, sort) : filteredItems

	function handleRoleChange(nextRole: Role) {
		setRole(nextRole)
		trackFilters({ role: nextRole, stats, match })
	}

	function handleStatsChange(nextStats: StatKey[]) {
		setStats(nextStats)
		trackFilters({ role, stats: nextStats, match })
	}

	function handleMatchChange(nextMatch: StatMatch) {
		setMatch(nextMatch)
		trackFilters({ role, stats, match: nextMatch })
	}

	function handleQueryChange(nextQuery: string) {
		setQuery(nextQuery)
		trackSearch(nextQuery.length)
	}

	function handleSearchEscape() {
		// Render the cleared list first, so the Tab stop to focus is in the DOM.
		flushSync(() => handleQueryChange(""))
		focusRovingTabStop(listRef.current)
	}

	function handleSortChange(nextSort: ItemSort | undefined) {
		setSort(nextSort)
		track("shop_sorted", {
			stat: nextSort?.stat ?? null,
			direction: nextSort?.direction ?? null,
		})
	}

	return (
		<div className="bg-primary-4">
			<div className="flex justify-center px-2.5 pt-2">
				<ItemSearch
					query={query}
					onQueryChange={handleQueryChange}
					onEscape={handleSearchEscape}
				/>
			</div>
			<RoleFilter role={role} onRoleChange={handleRoleChange} />
			<div className="flex items-center justify-center gap-2 px-2.5 pb-1.5">
				<StatMatchToggle match={match} onMatchChange={handleMatchChange} />
				<StatFilter stats={stats} onStatsChange={handleStatsChange} />
			</div>
			<StatSort sort={sort} onSortChange={handleSortChange} />
			<ItemList ref={listRef} aria-label="Item shop">
				<ItemGrid items={items} onItemClick={onItemClick} />
				{itemsQuery.isSuccess && !items.length && (
					<p className="w-full p-5 text-center text-white">
						No items match these filters.
					</p>
				)}
				{itemsQuery.isPending && (
					<>
						<span className="sr-only" role="status">
							Loading items
						</span>
						<ItemGridSkeleton />
					</>
				)}
				{itemsQuery.isError && (
					<LoadError className="pb-8" onRetry={() => itemsQuery.refetch()}>
						Could not load the items. Check your connection.
					</LoadError>
				)}
			</ItemList>
		</div>
	)
}

const SEARCH_TRACK_DELAY_MS = 1000

type ShopFilters = { role: Role; stats: StatKey[]; match: StatMatch }

function trackFilters({ role, stats, match }: ShopFilters) {
	track("shop_filtered", {
		roles: role === "ALL" ? [] : [role],
		stats,
		match,
	})
}
