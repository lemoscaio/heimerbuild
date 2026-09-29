import type { ComputedStats } from "@/lib/stats/compute-stats"
import { diffStats } from "../lib/diff-stats"
import { formatStat, statRows } from "../lib/stats-info"

type StatChangeListProps = {
	stats: ComputedStats
	next: ComputedStats
}

/** The stats that change from `stats` to `next`, as `current → next`. */
export function StatChangeList({ stats, next }: StatChangeListProps) {
	const nextTotals = diffStats(stats, next)
	const rows = statRows.filter((info) => nextTotals[info.stat] !== undefined)

	if (!rows.length) {
		return <p className="text-subtle text-xs">No stat on the panel changes.</p>
	}

	return (
		<ul className="flex flex-col gap-1 text-sm">
			{rows.map(({ stat, label, format, suffix }) => (
				<li key={stat} className="flex justify-between gap-2">
					<span className="text-prose">{label}</span>
					<span className="tabular-nums">
						{formatStat(stats[stat].total, format)}
						{suffix}
						<span aria-hidden="true"> → </span>
						<span className="sr-only"> becomes </span>
						<span className="font-bold text-success">
							{formatStat(nextTotals[stat] ?? 0, format)}
							{suffix}
						</span>
					</span>
				</li>
			))}
		</ul>
	)
}
