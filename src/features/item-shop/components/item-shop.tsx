import { useState } from "react"
import DotLoader from "react-spinners/esm/DotLoader"
import { useItems } from "@/data/hooks/use-items"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import {
	filterItemsByRole,
	type RoleFilter as Role,
} from "../lib/filter-items-by-role"
import { filterItemsByStats } from "../lib/filter-items-by-stats"
import { type ItemSort, sortItemsByStat } from "../lib/sort-items-by-stat"
import { ItemGrid } from "./item-grid"
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

	function toggleStat(stat: StatKey) {
		setStats((current) =>
			current.includes(stat)
				? current.filter((selected) => selected !== stat)
				: [...current, stat],
		)
	}

	return (
		<div className="champion-info__items items">
			<RoleFilter role={role} onRoleChange={setRole} />
			<StatFilter stats={stats} onToggleStat={toggleStat} />
			<StatSort sort={sort} onSortChange={setSort} />
			<div className="items__second-row">
				<div className="items__list">
					<ItemGrid items={items} onItemClick={onItemClick} />
					{itemsQuery.isSuccess && !items.length && (
						<p className="items__empty">No items match these filters.</p>
					)}
					{itemsQuery.isPending && (
						<DotLoader color="white" className="items__loader" />
					)}
					{itemsQuery.isError && (
						<div className="items__load-error-container load-error-container">
							<p>Something went wrong!</p>
							<button
								type="button"
								className="items__load-button load-button"
								onClick={() => itemsQuery.refetch()}
							>
								Click here to try again
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
