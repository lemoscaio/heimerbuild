import type { ComputedStats } from "@/lib/stats/compute-stats"
import { diffStats } from "../lib/diff-stats"
import { championStatRows, statGroups } from "../lib/stats-info"
import { StatRow } from "./stat-row"

type StatsPanelProps = {
	stats: ComputedStats
	/** The champion's `resource`: names the mana rows, or hides them. */
	resource: string
	/** Stats with a candidate change (an item, the stat shards): changed rows show `current → next`. */
	preview?: { label: string; stats: ComputedStats }
	/** Notes under the stat groups. */
	children?: React.ReactNode
}

export function StatsPanel({
	stats,
	resource,
	preview,
	children,
}: StatsPanelProps) {
	const nextTotals = preview ? diffStats(stats, preview.stats) : {}
	const rows = championStatRows(resource, stats)
	const groups = statGroups.map((group) => ({
		...group,
		rows: rows.filter((info) => info.group === group.group),
	}))

	return (
		<section className="flex flex-col gap-3" aria-label="Champion stats">
			<div className="flex items-baseline justify-between gap-2">
				<h2 className="font-bold font-display text-base">Stats</h2>
				{preview && (
					<span className="truncate text-subtle text-xs">
						preview with <span className="text-lilac">{preview.label}</span>
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
			{children}
		</section>
	)
}
