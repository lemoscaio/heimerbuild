import type { ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { shopStats } from "../lib/shop-stats"
import type { ItemSort } from "../lib/sort-items-by-stat"

type StatSortProps = {
	sort: ItemSort | undefined
	onSortChange: (sort: ItemSort | undefined) => void
}

export function StatSort({ sort, onSortChange }: StatSortProps) {
	function handleStatChange(event: ChangeEvent<HTMLSelectElement>) {
		const stat = shopStats.find(
			(option) => option.stat === event.target.value,
		)?.stat
		onSortChange(
			stat ? { stat, direction: sort?.direction ?? "desc" } : undefined,
		)
	}

	function toggleDirection() {
		if (sort) {
			onSortChange({
				...sort,
				direction: sort.direction === "desc" ? "asc" : "desc",
			})
		}
	}

	return (
		<div className="items__stat-sort">
			<label className="items__sort-label">
				Sort by
				<select
					className="items__sort-select"
					value={sort?.stat ?? ""}
					onChange={handleStatChange}
				>
					<option value="">Shop order</option>
					{shopStats.map(({ stat, label }) => (
						<option key={stat} value={stat}>
							{label}
						</option>
					))}
				</select>
			</label>
			<Button
				type="button"
				size="sm"
				disabled={!sort}
				onClick={toggleDirection}
			>
				{sort?.direction === "asc" ? "Lowest first" : "Highest first"}
			</Button>
		</div>
	)
}
