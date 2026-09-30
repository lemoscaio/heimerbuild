import {
	type ItemStats,
	STAT_UNITS,
	type StatKey,
} from "../../scripts/sync-data/schemas/item"
import { formatStat, statDisplay } from "./stat-display"

export type ItemStatLine = { stat: StatKey; value: string; label: string }

function formatValue(stat: StatKey, value: number) {
	const shown = formatStat(value, STAT_UNITS[stat])
	return value < 0 ? shown : `+${shown}`
}

/** An item's stats as display lines ("+25%", "Attack Speed"), in schema order. */
export function itemStatLines(stats: ItemStats): ItemStatLine[] {
	return (Object.keys(STAT_UNITS) as StatKey[]).flatMap((stat) => {
		const value = stats[stat]
		const { label, itemLabel = label } = statDisplay[stat]
		return value === undefined
			? []
			: [{ stat, value: formatValue(stat, value), label: itemLabel }]
	})
}
