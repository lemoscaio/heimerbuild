import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/cn"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { shopStats } from "../lib/shop-stats"
import type { ItemSort } from "../lib/sort-items-by-stat"

// `null` is the shop's own order.
const sortOptions = [
	{ value: null, label: "Shop order" },
	...shopStats.map(({ stat, label }) => ({ value: stat, label })),
]

type StatSortProps = {
	sort: ItemSort | undefined
	onSortChange: (sort: ItemSort | undefined) => void
	className?: string
}

export function StatSort({ sort, onSortChange, className }: StatSortProps) {
	function handleStatChange(stat: StatKey | null) {
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
		<div
			className={cn(
				"flex flex-wrap items-center justify-center gap-2 px-2.5 pb-2 text-white text-xs",
				className,
			)}
		>
			<Select
				items={sortOptions}
				value={sort?.stat ?? null}
				onValueChange={handleStatChange}
			>
				<div className="flex items-center gap-1.5">
					<SelectLabel>Sort by</SelectLabel>
					<SelectTrigger size="sm" className="w-40">
						<SelectValue />
					</SelectTrigger>
				</div>
				<SelectContent>
					{sortOptions.map(({ value, label }) => (
						<SelectItem key={label} value={value} className="text-xs">
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
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
