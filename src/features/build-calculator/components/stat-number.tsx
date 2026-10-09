import {
	formatBonus,
	formatDelta,
	formatTotal,
	type ValueFormat,
} from "../lib/stat-values"
import { AnimatedNumber } from "./stats-panel.motion"

const FORMATTERS = {
	total: formatTotal,
	bonus: formatBonus,
	delta: formatDelta,
} as const

type StatNumberProps = {
	value: number
	valueFormat: ValueFormat
	/** How it reads: a total ("1.943"), a signed part ("+40%") or a difference ("+0.582"). */
	kind: keyof typeof FORMATTERS
}

/** A stat value that counts to a new value instead of jumping. */
export function StatNumber({ value, valueFormat, kind }: StatNumberProps) {
	const { format, suffix, attackSpeedRatio } = valueFormat
	return (
		// Another unit or ratio (a form switch) starts a new number rather than counting across units.
		<AnimatedNumber
			key={`${kind}-${format}-${suffix}-${attackSpeedRatio}`}
			value={value}
			format={(next) => FORMATTERS[kind](next, valueFormat)}
		/>
	)
}
