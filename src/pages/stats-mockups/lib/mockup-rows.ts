import {
	championStatRows,
	type StatRowInfo,
} from "@/features/build-calculator/lib/stats-info"
import { type StatGroup, statGroups } from "@/lib/stat-display"
import type { StatBreakdown } from "@/lib/stats/compute-stats"
import type { ValueFormat } from "./format-values"
import type { MockupStats } from "./mockup-stats"
import type { StatPart } from "./stat-composition"

// Totals are sums of floats: ignore differences below display precision.
const EPSILON = 1e-9

/** One stats row, as every mockup option reads it. */
export type MockupRow = {
	info: StatRowInfo
	valueFormat: ValueFormat
	breakdown: StatBreakdown
	/** The total with the preview item, when it changes. */
	next?: number
	/** How far the total is from the other form's, when it differs. */
	formDelta?: number
	/** The other form's total, when it differs. */
	comparedTotal?: number
	/** The total split by source; with a preview, the previewed build's (the item flagged). */
	parts: readonly StatPart[]
}

export type MockupRowGroup = {
	group: StatGroup
	label: string
	rows: MockupRow[]
}

function differs(a: number, b: number | undefined) {
	return b !== undefined && Math.abs(a - b) > EPSILON
}

/** The stats panel's rows, by group, with everything the options may show. */
export function mockupRows(
	{ stats, composition, preview, compared, attackSpeedRatio }: MockupStats,
	resource: string,
): MockupRowGroup[] {
	const rows = championStatRows(resource, stats).map((info): MockupRow => {
		const breakdown = stats[info.stat]
		const next = preview?.stats[info.stat].total
		const comparedTotal = compared?.stats[info.stat].total
		return {
			info,
			valueFormat: { ...info, attackSpeedRatio },
			breakdown,
			...(differs(breakdown.total, next) && { next }),
			...(comparedTotal !== undefined &&
				differs(breakdown.total, comparedTotal) && {
					comparedTotal,
					formDelta: breakdown.total - comparedTotal,
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
