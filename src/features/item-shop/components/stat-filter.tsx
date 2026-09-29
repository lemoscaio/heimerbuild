import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { shopStats } from "../lib/shop-stats"

type StatFilterProps = {
	stats: readonly StatKey[]
	onStatsChange: (stats: StatKey[]) => void
}

export function StatFilter({ stats, onStatsChange }: StatFilterProps) {
	return (
		<ToggleGroup
			multiple
			aria-label="Filter by stat"
			className="grid w-max grid-cols-12 gap-1"
			value={stats}
			onValueChange={onStatsChange}
		>
			{shopStats.map(({ stat, label, icon }) => (
				<ToggleGroupItem
					key={stat}
					value={stat}
					size="icon-sm"
					className="max-lg:size-11 max-lg:p-2.5"
					title={label}
					aria-label={label}
				>
					<img src={icon} alt="" className="size-full" />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
