import type { ComputedStats } from "@/lib/stats/compute-stats"
import { championStatRows, formatStat, keyStatRows } from "../lib/stats-info"

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
			{keyRows.map(({ stat, label, format }) => (
				<div key={stat} className="rounded-md bg-primary-3 px-2.5 py-1">
					<dt className="truncate text-subtle">{label}</dt>
					<dd className="font-medium text-sm tabular-nums">
						{formatStat(stats[stat].total, format)}
					</dd>
				</div>
			))}
		</dl>
	)
}
