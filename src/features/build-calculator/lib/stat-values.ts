import { formatStat } from "@/lib/stat-display"
import type { StatRowInfo } from "./stats-info"

/** How a row's values read. Bonus attack speed is a percent of the champion's ratio, as in game. */
export type ValueFormat = Pick<StatRowInfo, "format" | "suffix"> & {
	attackSpeedRatio: number
}

function signed(value: number, text: string) {
	return `${value < 0 ? "−" : "+"}${text}`
}

/** A total, with its unit: "1.943", "35%", "12.4/5s". */
export function formatTotal(
	value: number,
	{ format, suffix = "" }: ValueFormat,
) {
	return `${formatStat(value, format)}${suffix}`
}

/** How far a total is from another one, in the total's unit: "+0.581", "−150". */
export function formatDelta(value: number, valueFormat: ValueFormat) {
	return signed(value, formatTotal(Math.abs(value), valueFormat))
}

/** A bonus or a part of one, signed; attack speed as a percent of the ratio: "+40%", "−6.8%". */
export function formatBonus(value: number, valueFormat: ValueFormat) {
	const { format, attackSpeedRatio } = valueFormat
	if (format !== "attackSpeed") return formatDelta(value, valueFormat)
	return signed(
		value,
		formatStat(Math.abs(value) / attackSpeedRatio, "percent"),
	)
}
