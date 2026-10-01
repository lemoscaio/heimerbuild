import { statGroups } from "@/lib/stat-display"
import type { ComputedStats, StatName } from "@/lib/stats/compute-stats"
import { diffStats, type FormComparison } from "../lib/diff-stats"
import { championStatRows } from "../lib/stats-info"
import { StatRow } from "./stat-row"

type StatsPanelProps = {
	stats: ComputedStats
	/** The champion's `resource`: names the mana rows, or hides them. */
	resource: string
	/** Stats with a candidate change (an item, the stat shards): changed rows show `current → next`. */
	preview?: { label: string; stats: ComputedStats }
	/** For a champion with forms: each stat that differs from the compared form gets a delta chip. */
	formComparison?: FormComparison
	/** Notes under the stat groups. */
	children?: React.ReactNode
}

function formDelta(comparison: FormComparison | undefined, stat: StatName) {
	const delta = comparison?.deltas[stat]
	return comparison && delta !== undefined
		? { delta, comparedWith: comparison.comparedName }
		: undefined
}

function FormComparisonSummary({ comparedName, deltas }: FormComparison) {
	const count = Object.keys(deltas).length

	return (
		<p className="-mt-2 text-subtle text-xs">
			{count
				? `${count} ${count === 1 ? "stat differs" : "stats differ"} from ${comparedName}`
				: `Same stats as ${comparedName}`}
		</p>
	)
}

export function StatsPanel({
	stats,
	resource,
	preview,
	formComparison,
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
				{preview ? (
					<span className="truncate text-subtle text-xs">
						preview with <span className="text-lilac">{preview.label}</span>
					</span>
				) : (
					formComparison && (
						<span className="truncate text-subtle text-xs">
							{formComparison.formName}
						</span>
					)
				)}
			</div>
			{formComparison && <FormComparisonSummary {...formComparison} />}
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
									formDelta={formDelta(formComparison, info.stat)}
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
