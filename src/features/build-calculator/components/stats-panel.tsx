import type { ComputedStats } from "@/lib/stats/compute-stats"
import { statRows } from "../lib/stats-info"
import { StatRow } from "./stat-row"

const statGroups = [
	{ className: "stats__group-1", rows: statRows.slice(0, 8) },
	{ className: "stats__group-2", rows: statRows.slice(12, 19) },
	{ className: "stats__group-3", rows: statRows.slice(8, 12) },
	{ className: "stats__group-4", rows: statRows.slice(19) },
]

type StatsPanelProps = {
	stats: ComputedStats
}

export function StatsPanel({ stats }: StatsPanelProps) {
	return (
		<section className="champion-info__stats stats" aria-label="Champion stats">
			{statGroups.map(({ className, rows }) => (
				<ul key={className} className={`stats__group ${className}`}>
					{rows.map((info) => (
						<StatRow key={info.stat} info={info} breakdown={stats[info.stat]} />
					))}
				</ul>
			))}
		</section>
	)
}
