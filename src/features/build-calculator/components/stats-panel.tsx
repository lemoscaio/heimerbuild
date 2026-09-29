import type { ComputedStats } from "@/lib/stats/compute-stats"
import { statGroups, statRows } from "../lib/stats-info"
import { StatRow } from "./stat-row"

const groups = statGroups.map((group) => ({
	...group,
	rows: statRows.filter((info) => info.group === group.group),
}))

type StatsPanelProps = {
	stats: ComputedStats
}

export function StatsPanel({ stats }: StatsPanelProps) {
	return (
		<section className="flex flex-col gap-3" aria-label="Champion stats">
			<h2 className="font-bold font-display text-base">Stats</h2>
			<div className="grid gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-1">
				{groups.map(({ group, label, rows }) => (
					<div key={group}>
						<h3 className="pb-1 font-semibold text-gold text-xs uppercase tracking-widest">
							{label}
						</h3>
						<ul className="flex flex-col gap-0.5">
							{rows.map((info) => (
								<StatRow
									key={info.stat}
									info={info}
									breakdown={stats[info.stat]}
								/>
							))}
						</ul>
					</div>
				))}
			</div>
		</section>
	)
}
