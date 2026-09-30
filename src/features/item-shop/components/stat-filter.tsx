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
			className="flex-wrap justify-center"
			value={stats}
			onValueChange={onStatsChange}
		>
			{shopStats.map(({ stat, label, icon }) => (
				<ToggleGroupItem
					key={stat}
					value={stat}
					size="icon-sm"
					title={label}
					aria-label={label}
				>
					<img src={icon} alt="" className="size-full" />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
