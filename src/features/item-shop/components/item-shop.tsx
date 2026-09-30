import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { LoadError } from "@/components/common/load-error"
import { useItems } from "@/data/hooks/use-items"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { track } from "@/lib/analytics/analytics"
import { cn } from "@/lib/cn"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { useDebouncedCallback } from "../hooks/use-debounced-callback"
import { focusRovingTabStop } from "../hooks/use-roving-focus"
import { useShopGrouping } from "../hooks/use-shop-grouping"
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
import type { ItemPickProps } from "../types/item-pick"
import { GroupingMenu } from "./grouping-menu"
import { ItemGrid } from "./item-grid"
import { ItemGridSkeleton } from "./item-grid-skeleton"
import { ItemList } from "./item-list"
import { ItemSearch } from "./item-search"
import { RoleFilter } from "./role-filter"
import { SortMenu } from "./sort-menu"
import { StatMatchToggle } from "./stat-match-toggle"
import { StatRail } from "./stat-rail"

type ItemShopProps = {
	patch: string
	/** `expanded`: the full-width shop, with bigger tiles. */
	layout?: "compact" | "expanded"
	/** Icon buttons after the sort and view menus, such as the switch to the expanded shop. */
	actions?: React.ReactNode
} & ItemPickProps

export function ItemShop({
	patch,
	layout = "compact",
	actions,
	...pickProps
}: ItemShopProps) {
	const itemsQuery = useItems(patch)
	const [role, setRole] = useState<Role>("ALL")
	const [stats, setStats] = useState<StatKey[]>([])
	const [match, setMatch] = useState<StatMatch>("all")
	const [sort, setSort] = useState<ItemSort>()
	const [query, setQuery] = useState("")
	const [grouping, setGrouping] = useShopGrouping()
	const listRef = useRef<HTMLElement>(null)
	useAnalyticsContext({ shop_grouping: grouping }, { keepAfterUnmount: true })
	useAnalyticsContext({ shop_stat_match: match })
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

	const isExpanded = layout === "expanded"

	return (
		<div
			className={cn(
				"@container grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)] gap-x-3 gap-y-2 [grid-template-areas:'roles_roles_roles''rail_search_actions''rail_items_items']",
				{ "p-4 lg:gap-x-5 lg:px-5 lg:pt-3": isExpanded },
			)}
		>
			<div className="flex min-w-0 items-center gap-3 [grid-area:roles]">
				<ShopTitle className="@max-4xl:sr-only shrink-0" />
				<RoleFilter role={role} onRoleChange={handleRoleChange} />
			</div>
			<div className="flex items-center gap-1.5 self-center [grid-area:actions]">
				<SortMenu
					className="max-lg:size-11"
					sort={sort}
					onSortChange={handleSortChange}
				/>
				<GroupingMenu
					className="max-lg:size-11"
					grouping={grouping}
					onGroupingChange={setGrouping}
				/>
				{actions}
			</div>
			<StatRail
				className={cn(
					"scrollbar-purple [grid-area:rail] max-lg:sticky max-lg:top-[calc(var(--spacing-header)+--spacing(2))] max-lg:max-h-[calc(100dvh-var(--spacing-header)-8rem)] max-lg:self-start max-lg:overflow-y-auto lg:min-h-0 lg:overflow-y-auto",
					{ "lg:border-primary-2 lg:border-r lg:pr-3": isExpanded },
				)}
				stats={stats}
				onStatsChange={handleStatsChange}
			>
				<StatMatchToggle match={match} onMatchChange={handleMatchChange} />
			</StatRail>
			<div className="flex min-w-0 items-center gap-3 [grid-area:search]">
				<ItemSearch
					className="min-w-0 max-w-none flex-1"
					query={query}
					onQueryChange={handleQueryChange}
					onEscape={handleSearchEscape}
				/>
				{itemsQuery.isSuccess && (
					<p
						aria-live="polite"
						className="shrink-0 text-subtle text-xs max-lg:sr-only"
					>
						{items.length} {items.length === 1 ? "item" : "items"}
					</p>
				)}
			</div>
			<ItemList
				ref={listRef}
				aria-label="Item shop"
				className={cn("[grid-area:items]", {
					"lg:bg-transparent lg:p-0": isExpanded,
				})}
			>
				<ItemGrid
					items={items}
					grouping={grouping}
					tileSize={isExpanded ? "lg" : "md"}
					{...pickProps}
				/>
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

function ShopTitle({ className }: { className?: string }) {
	return (
		<h2 className={cn("font-bold font-display text-base", className)}>
			Item shop
		</h2>
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
