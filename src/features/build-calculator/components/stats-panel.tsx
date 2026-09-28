import type { ComputedStats } from "@/lib/stats/compute-stats"
import { statRows } from "../lib/stats-info"
import { StatRow } from "./stat-row"

// Grid order: core stats next to penetration, then resources next to tenacity.
const statGroups = [
	{ key: "core", rows: statRows.slice(0, 8) },
	{ key: "penetration", rows: statRows.slice(12, 19) },
	{ key: "resources", rows: statRows.slice(8, 12) },
	{ key: "tenacity", rows: statRows.slice(19) },
]

type StatsPanelProps = {
	stats: ComputedStats
}

export function StatsPanel({ stats }: StatsPanelProps) {
	return (
		<section
			className="grid grid-cols-2 gap-x-2.5 gap-y-4 bg-primary-3 px-2.5 py-4 text-white lg:mx-auto lg:w-125"
			aria-label="Champion stats"
		>
			{statGroups.map(({ key, rows }) => (
				<ul key={key}>
					{rows.map((info) => (
						<StatRow key={info.stat} info={info} breakdown={stats[info.stat]} />
					))}
				</ul>
			))}
		</section>
	)
}
