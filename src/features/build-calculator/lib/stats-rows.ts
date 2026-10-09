import { type StatGroup, statGroups } from "@/lib/stat-display"
import type { ComputedStats } from "@/lib/stats/compute-stats"
import type { StatComposition, StatPart } from "@/lib/stats/stat-composition"
import { diffStats, type FormComparison } from "./diff-stats"
import type { ValueFormat } from "./stat-values"
import { championStatRows, type StatRowInfo } from "./stats-info"

/** The build's stats with each one split by source. */
export type ComposedStats = {
	stats: ComputedStats
	composition: StatComposition
}

export type StatsRowsInput = ComposedStats & {
	/** The champion's `resource`: names the mana rows, or hides them. */
	resource: string
	attackSpeedRatio: number
	/** The stats with a candidate change (an item, the stat shards). */
	preview?: ComposedStats
	formComparison?: FormComparison
}

/** One Stats panel row: its total, the previewed total and the other form's, and its parts. */
export type StatsRow = {
	info: StatRowInfo
	valueFormat: ValueFormat
	total: number
	/** The total with the preview, when it changes. */
	next?: number
	/** How far the total is from the other form's, when it differs. */
	formDelta?: number
	/** The other form's total, when it differs. */
	comparedTotal?: number
	/** The total split by source; with a preview, the previewed build's (its parts flagged). */
	parts: readonly StatPart[]
}

export type StatsRowGroup = {
	group: StatGroup
	label: string
	rows: StatsRow[]
}

/** The Stats panel's rows, by group. */
export function statsRows({
	stats,
	composition,
	resource,
	attackSpeedRatio,
	preview,
	formComparison,
}: StatsRowsInput): StatsRowGroup[] {
	const nextTotals = preview ? diffStats(stats, preview.stats) : {}
	const rows = championStatRows(resource, stats).map((info): StatsRow => {
		const { total } = stats[info.stat]
		const next = nextTotals[info.stat]
		const formDelta = formComparison?.deltas[info.stat]
		return {
			info,
			valueFormat: { ...info, attackSpeedRatio },
			total,
			...(next !== undefined && { next }),
			...(formDelta !== undefined && {
				formDelta,
				comparedTotal: total - formDelta,
			}),
			parts: (preview?.composition ?? composition)[info.stat],
		}
	})
	return statGroups.map(({ group, label }) => ({
		group,
		label,
		rows: rows.filter((row) => row.info.group === group),
	}))
}
