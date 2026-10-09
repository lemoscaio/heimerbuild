import {
	formatBonus,
	formatDelta,
	formatTotal,
	type ValueFormat,
} from "./lib/format-values"
import { useMockupMotion } from "./mockup-motion"
import { AnimatedNumber } from "./option-sources.motion"

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

/** A stat value as text; in Option 4 it counts to a new value instead of jumping. */
export function StatNumber({ value, valueFormat, kind }: StatNumberProps) {
	const format = (next: number) => FORMATTERS[kind](next, valueFormat)
	return useMockupMotion() === "animated" ? (
		// A new format (another build's attack speed ratio) starts a new number rather than reformatting.
		<AnimatedNumber
			key={`${kind}-${valueFormat.format}-${valueFormat.suffix}-${valueFormat.attackSpeedRatio}`}
			value={value}
			format={format}
		/>
	) : (
		format(value)
	)
}
