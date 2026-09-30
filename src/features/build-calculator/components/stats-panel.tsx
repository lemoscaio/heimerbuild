import type { ComputedStats } from "@/lib/stats/compute-stats"
import { diffStats } from "../lib/diff-stats"
import { statGroups, statRows } from "../lib/stats-info"
import { StatRow } from "./stat-row"

const groups = statGroups.map((group) => ({
	...group,
	rows: statRows.filter((info) => info.group === group.group),
}))

type StatsPanelProps = {
	stats: ComputedStats
	/** Stats with a candidate item added: changed rows show `current → next`. */
	preview?: { itemName: string; stats: ComputedStats }
}

export function StatsPanel({ stats, preview }: StatsPanelProps) {
	const nextTotals = preview ? diffStats(stats, preview.stats) : {}

	return (
		<section className="flex flex-col gap-3" aria-label="Champion stats">
			<div className="flex items-baseline justify-between gap-2">
				<h2 className="font-bold font-display text-base">Stats</h2>
				{preview && (
					<span className="truncate text-subtle text-xs">
						preview with <span className="text-lilac">{preview.itemName}</span>
					</span>
				)}
			</div>
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
									next={nextTotals[info.stat]}
								/>
							))}
						</ul>
					</div>
				))}
			</div>
		</section>
	)
}
