import { NumberField } from "@/components/ui/number-field"
import { WAIT_SECONDS } from "../lib/combat-sequence"

/** A wait's length, in quarter seconds; an emptied field keeps the last length. */
export function CombatWaitLength({
	seconds,
	onChange,
}: {
	seconds: number
	onChange: (seconds: number) => void
}) {
	return (
		<div className="flex items-center gap-1.5 text-xs">
			<NumberField
				label="Wait in seconds"
				min={WAIT_SECONDS.min}
				max={WAIT_SECONDS.max}
				step={WAIT_SECONDS.step}
				value={seconds}
				onValueChange={(next) => {
					if (next !== null) onChange(next)
				}}
				className="[&_input]:w-12"
			/>
			<span aria-hidden className="text-subtle">
				s
			</span>
		</div>
	)
}
