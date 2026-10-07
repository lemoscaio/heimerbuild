import { cva } from "class-variance-authority"
import { useRef } from "react"
import { flushSync } from "react-dom"
import { LoadError } from "@/components/common/load-error"
import { PoliteStatus } from "@/components/common/polite-status"
import { useItems } from "@/data/hooks/use-items"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { track } from "@/lib/analytics/analytics"
import { cn } from "@/lib/cn"
import { useFocusOnLayoutChange } from "../hooks/use-focus-on-layout-change"
import { useReturnFocusToItem } from "../hooks/use-return-focus-to-item"
import { focusRovingTabStop } from "../hooks/use-roving-focus"
import { useShopGrouping } from "../hooks/use-shop-grouping"
import { filterShopItems } from "../lib/filter-shop-items"
import { shopCatalog } from "../lib/shop-catalog"
import {
	describeToken,
	type ShopFilters,
	searchTokensForAnalytics,
	tokensFromFilters,
} from "../lib/shop-query"
import { type ItemSort, sortItemsByStat } from "../lib/sort-items-by-stat"
import type { ItemPickProps } from "../types/item-pick"
import { GroupingMenu } from "./grouping-menu"
import { ItemGrid } from "./item-grid"
import { ItemGridSkeleton } from "./item-grid-skeleton"
import { ItemList } from "./item-list"
import { RoleFilter } from "./role-filter"
import { ShopSearch, type ShopSearchChange } from "./shop-search"
import { type ShopLayout, useShopState } from "./shop-state-provider"
import { SortMenu } from "./sort-menu"
import { StatMatchToggle } from "./stat-match-toggle"
import { StatRail } from "./stat-rail"

const shopGrid = cva(
	"@container grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto_minmax(0,1fr)] gap-x-3 gap-y-2 [grid-template-areas:'roles_roles_roles''rail_search_actions''rail_items_items']",
	{
		variants: {
			layout: {
				compact: "",
				expanded: "p-4 lg:gap-x-5 lg:px-5 lg:pt-3",
			} satisfies Record<ShopLayout, string>,
		},
	},
)

const statRail = cva(
	"scrollbar-purple scroll-fade-content [grid-area:rail] max-lg:sticky max-lg:top-[calc(var(--spacing-header)+--spacing(2))] max-lg:max-h-[calc(100dvh-var(--spacing-header)-8rem)] max-lg:self-start max-lg:overflow-y-auto lg:min-h-0 lg:overflow-y-auto",
	{
		variants: {
			layout: {
				compact: "",
				expanded: "lg:border-line lg:border-r lg:pr-3",
			} satisfies Record<ShopLayout, string>,
		},
	},
)

// The expanded shop's list sits on the page itself, not in an inset well.
const itemList = cva("[grid-area:items]", {
	variants: {
		layout: {
			compact: "",
			expanded: "lg:bg-transparent lg:p-0",
		} satisfies Record<ShopLayout, string>,
	},
})

type ItemShopProps = {
	patch: string
	/** `expanded`: the full-width shop, with bigger tiles. */
	layout?: ShopLayout
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
	const { filters, setFilters, sort, setSort, query, setQuery, lastLayout } =
		useShopState()
	const [grouping, setGrouping] = useShopGrouping()
	const listRef = useRef<HTMLElement>(null)
	const searchRef = useRef<HTMLDivElement>(null)
	const actionsRef = useRef<HTMLSpanElement>(null)
	// Expanding moves focus to the search; collapsing, back to the switch in `actions`.
	useFocusOnLayoutChange(
		layout,
		{ expanded: searchRef, compact: actionsRef },
		lastLayout,
	)
	useReturnFocusToItem(pickProps.selectedItemId, listRef)
	const { role, stats, match } = filters
	useAnalyticsContext("shop_grouping", grouping, { keepAfterUnmount: true })
	useAnalyticsContext("shop_stat_match", match)
	const allItems = itemsQuery.data ? Object.values(itemsQuery.data) : []
	const catalog = shopCatalog(allItems)
	const trackSearch = useDebouncedCallback((search: ShopSearchChange) => {
		const results = filterShopItems(allItems, search).length
		track("shop_searched", {
			query: search.query.trim().toLowerCase().slice(0, MAX_TRACKED_QUERY),
			queryLength: search.query.length,
			tokens: searchTokensForAnalytics(search.filters),
			results,
			zeroResults: !results,
		})
	}, SEARCH_TRACK_DELAY_MS)

	const filteredItems = filterShopItems(allItems, { filters, query })
	const items = sort ? sortItemsByStat(filteredItems, sort) : filteredItems

	function handleFiltersChange(nextFilters: ShopFilters) {
		if (sameFilters(filters, nextFilters)) return
		setFilters(nextFilters)
		trackFilters(nextFilters)
	}

	function handleSearchChange(change: ShopSearchChange) {
		setQuery(change.query)
		handleFiltersChange(change.filters)
		trackSearch(change)
	}

	function handleSearchEscape() {
		// Render the cleared list first, so the Tab stop to focus is in the DOM.
		flushSync(() => handleSearchChange({ query: "", filters }))
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
		<div className={shopGrid({ layout })}>
			<div className="flex min-w-0 items-center gap-3 [grid-area:roles]">
				<ShopTitle className="@max-4xl:sr-only shrink-0" />
				<RoleFilter
					role={role}
					onRoleChange={(nextRole) =>
						handleFiltersChange({ ...filters, role: nextRole })
					}
				/>
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
				<span ref={actionsRef} className="contents">
					{actions}
				</span>
			</div>
			<StatRail
				className={statRail({ layout })}
				stats={stats}
				onStatsChange={(nextStats) =>
					handleFiltersChange({ ...filters, stats: nextStats })
				}
			>
				<StatMatchToggle
					match={match}
					onMatchChange={(nextMatch) =>
						handleFiltersChange({ ...filters, match: nextMatch })
					}
				/>
			</StatRail>
			<div
				ref={searchRef}
				className="flex min-w-0 items-center gap-3 [grid-area:search]"
			>
				<ShopSearch
					className="min-w-0 flex-1"
					query={query}
					filters={filters}
					items={items}
					catalog={catalog}
					onSearchChange={handleSearchChange}
					onItemPick={pickProps.onItemSelect}
					onEscape={handleSearchEscape}
				/>
				{itemsQuery.isSuccess && (
					<>
						<p
							aria-hidden="true"
							className="shrink-0 text-subtle text-xs max-lg:hidden"
						>
							{itemCount(items.length)}
						</p>
						<PoliteStatus
							message={items.length ? itemCount(items.length) : NO_ITEMS}
						/>
					</>
				)}
			</div>
			<ItemList
				ref={listRef}
				aria-label="Item shop"
				className={itemList({ layout })}
			>
				<ItemGrid
					items={items}
					grouping={grouping}
					tileSize={isExpanded ? "lg" : "md"}
					{...pickProps}
				/>
				{itemsQuery.isSuccess && !items.length && (
					<p className="w-full p-5 text-center text-white">{NO_ITEMS}</p>
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

function itemCount(count: number) {
	return `${count} ${count === 1 ? "item" : "items"}`
}

const NO_ITEMS = "No items match these filters."

const SEARCH_TRACK_DELAY_MS = 1000
const MAX_TRACKED_QUERY = 50

function sameFilters(a: ShopFilters, b: ShopFilters) {
	return a.match === b.match && filterTerms(a) === filterTerms(b)
}

/** The terms carry each value too: `ap>=80` and `ap>=100` differ. */
function filterTerms(filters: ShopFilters) {
	return tokensFromFilters(filters)
		.map((token) => describeToken(token).term)
		.join(" ")
}

function trackFilters({ role, stats, match, conditions }: ShopFilters) {
	track("shop_filtered", {
		roles: role === "ALL" ? [] : [role],
		stats: [...stats],
		match,
		conditions: conditions.map((condition) => describeToken(condition).value),
	})
}
