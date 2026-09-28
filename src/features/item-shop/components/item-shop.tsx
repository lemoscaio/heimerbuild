import { useState } from "react"
import { LoadError } from "@/components/common/load-error"
import { useItems } from "@/data/hooks/use-items"
import { track } from "@/lib/analytics/analytics"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import {
	filterItemsByRole,
	type RoleFilter as Role,
} from "../lib/filter-items-by-role"
import { filterItemsByStats } from "../lib/filter-items-by-stats"
import { type ItemSort, sortItemsByStat } from "../lib/sort-items-by-stat"
import { ItemGrid } from "./item-grid"
import { ItemGridSkeleton } from "./item-grid-skeleton"
import { ItemList } from "./item-list"
import { RoleFilter } from "./role-filter"
import { StatFilter } from "./stat-filter"
import { StatSort } from "./stat-sort"

type ItemShopProps = {
	patch: string
	onItemClick: (itemId: string) => void
}

export function ItemShop({ patch, onItemClick }: ItemShopProps) {
	const itemsQuery = useItems(patch)
	const [role, setRole] = useState<Role>("ALL")
	const [stats, setStats] = useState<StatKey[]>([])
	const [sort, setSort] = useState<ItemSort>()

	const filteredItems = itemsQuery.data
		? filterItemsByStats(
				filterItemsByRole(Object.values(itemsQuery.data), role),
				stats,
			)
		: []
	const items = sort ? sortItemsByStat(filteredItems, sort) : filteredItems

	function handleRoleChange(nextRole: Role) {
		setRole(nextRole)
		trackFilters(nextRole, stats)
	}

	function handleStatsChange(nextStats: StatKey[]) {
		setStats(nextStats)
		trackFilters(role, nextStats)
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
			<RoleFilter role={role} onRoleChange={handleRoleChange} />
			<StatFilter stats={stats} onStatsChange={handleStatsChange} />
			<StatSort sort={sort} onSortChange={handleSortChange} />
			<ItemList aria-label="Item shop">
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

function trackFilters(role: Role, stats: StatKey[]) {
	track("shop_filtered", { roles: role === "ALL" ? [] : [role], stats })
}
