import type { StatRowInfo } from "@/features/build-calculator/lib/stats-info"
import { formatStat } from "@/lib/stat-display"

/** Bonus attack speed reads as a percent of the champion's ratio, as in game (wiki, "Attack speed"). */
export type ValueFormat = Pick<StatRowInfo, "format" | "suffix"> & {
	attackSpeedRatio: number
}

/** Below display precision: what float sums leave where the value is none. */
export function isZero(value: number) {
	return Math.abs(value) < 1e-9
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

/** A bonus or a part of one, signed; attack speed as a percent: "+210.9%", "−13.1%". */
export function formatBonus(value: number, valueFormat: ValueFormat) {
	const { format, attackSpeedRatio } = valueFormat
	const magnitude = Math.abs(value)
	if (format === "attackSpeed") {
		return signed(value, formatStat(magnitude / attackSpeedRatio, "percent"))
	}
	return formatDelta(value, valueFormat)
}

/** How far a total is from another one, in the total's unit: "+0.581", "−150". */
export function formatDelta(value: number, valueFormat: ValueFormat) {
	return signed(value, formatTotal(Math.abs(value), valueFormat))
}
