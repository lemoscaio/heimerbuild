import { formatStat } from "@/lib/stat-display"
import type { ComputedStats } from "@/lib/stats/compute-stats"
import { championStatRows, keyStatRows } from "../lib/stats-info"
import { NoFixedValue } from "./no-fixed-value"

type KeyStatsProps = {
	stats: ComputedStats
	/** The champion's `resource`: names the last tile, or swaps it for Ability Haste. */
	resource: string
}

/** The eight stats most builds care about, as compact tiles. */
export function KeyStats({ stats, resource }: KeyStatsProps) {
	const keyRows = keyStatRows(championStatRows(resource, stats))

	return (
		<dl aria-label="Key stats" className="grid grid-cols-4 gap-1.5 text-xs">
			{keyRows.map(({ stat, label, format, noFixedValue, description }) => (
				<div key={stat} className="rounded-md bg-surface px-2.5 py-1">
					<dt className="truncate text-subtle">{label}</dt>
					<dd className="font-medium text-sm tabular-nums">
						{noFixedValue ? (
							<NoFixedValue label={label} description={description} />
						) : (
							formatStat(stats[stat].total, format)
						)}
					</dd>
				</div>
			))}
		</dl>
	)
}
