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
import { ItemGrid } from "./item-grid"
import { ItemGridSkeleton } from "./item-grid-skeleton"
import { ItemList } from "./item-list"
import { ItemSearch } from "./item-search"
import { RoleFilter } from "./role-filter"
import { ShopGroupingSelect } from "./shop-grouping-select"
import { StatChecklist } from "./stat-checklist"
import { StatFilter } from "./stat-filter"
import { StatMatchToggle } from "./stat-match-toggle"
import { StatSort } from "./stat-sort"

type ItemShopProps = {
	patch: string
	/** `expanded`: filters in a side rail and bigger tiles. */
	layout?: "compact" | "expanded"
	/** Shown at the end of the title row, such as the switch to the expanded shop. */
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
	useAnalyticsContext({ shop_grouping: grouping, shop_stat_match: match })
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
	const groupingSelect = (
		<ShopGroupingSelect grouping={grouping} onGroupingChange={setGrouping} />
	)
	const search = (
		<ItemSearch
			className={cn("min-w-40 max-w-none flex-1", {
				"max-xl:basis-full": !isExpanded,
			})}
			query={query}
			onQueryChange={handleQueryChange}
			onEscape={handleSearchEscape}
		/>
	)
	const results = (
		<ItemList
			ref={listRef}
			aria-label="Item shop"
			className={cn({ "lg:bg-transparent lg:p-0": isExpanded })}
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
	)

	if (isExpanded) {
		return (
			<div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
				<div className="scrollbar-purple flex flex-col gap-5 border-primary-2 bg-primary-3 p-4 lg:overflow-y-auto lg:border-r lg:p-5">
					<div className="flex flex-col gap-1.5">
						<h3 className="font-semibold text-gold text-xs uppercase tracking-widest">
							Role
						</h3>
						<RoleFilter
							orientation="vertical"
							role={role}
							onRoleChange={handleRoleChange}
						/>
					</div>
					<StatChecklist stats={stats} onStatsChange={handleStatsChange}>
						<StatMatchToggle match={match} onMatchChange={handleMatchChange} />
					</StatChecklist>
				</div>
				<div className="flex min-h-0 flex-col gap-4 p-4 lg:p-5">
					<div className="flex flex-col gap-2.5">
						<div className="flex items-center gap-3">
							<ShopTitle className="shrink-0 text-lg" />
							{search}
							{actions}
						</div>
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
							<StatSort
								className="p-0"
								sort={sort}
								onSortChange={handleSortChange}
							/>
							{groupingSelect}
						</div>
					</div>
					{results}
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center justify-between gap-3 pb-1 max-lg:hidden">
				<ShopTitle />
				{actions}
			</div>
			<RoleFilter role={role} onRoleChange={handleRoleChange} />
			<div className="flex items-center justify-center gap-2 px-2.5 pb-2">
				<StatMatchToggle match={match} onMatchChange={handleMatchChange} />
				{/* A fixed 12-column grid (12 + 11 icons); it scrolls sideways when narrower. */}
				<div className="scrollbar-purple min-w-0 overflow-x-auto">
					<StatFilter stats={stats} onStatsChange={handleStatsChange} />
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-2.5 pb-2 max-lg:order-first xl:flex-nowrap">
				{search}
				<StatSort
					className="shrink-0 flex-nowrap p-0"
					sort={sort}
					onSortChange={handleSortChange}
				/>
				{groupingSelect}
			</div>
			{results}
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
