import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { shopStats } from "../lib/shop-stats"

type StatFilterProps = {
	stats: readonly StatKey[]
	onToggleStat: (stat: StatKey) => void
}

export function StatFilter({ stats, onToggleStat }: StatFilterProps) {
	return (
		<fieldset className="items__stat-filter">
			<legend className="sr-only">Filter by stat</legend>
			{shopStats.map(({ stat, label, icon }) => (
				<button
					type="button"
					key={stat}
					className="items__stat-chip icon-button"
					title={label}
					aria-label={label}
					aria-pressed={stats.includes(stat)}
					onClick={() => onToggleStat(stat)}
				>
					<img src={icon} alt="" className="items__stat-icon" />
				</button>
			))}
		</fieldset>
	)
}
