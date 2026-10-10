import { cva } from "class-variance-authority"
import { formatSecondsSpan } from "../lib/combat-format"

/** Gold when one of its hits lands after the next step started. */
const startTime = cva("text-[0.6875rem] tabular-nums", {
	variants: {
		timing: { late: "text-gold", onTime: "text-subtle" },
	},
})

type CombatStartTimeProps = {
	/** A step's start, or a group's first and last starts. */
	starts: { first: number; last: number }
	late: boolean
}

/** When a step started, muted, beside its land time: "starts 0.00 s". */
export function CombatStartTime({ starts, late }: CombatStartTimeProps) {
	return (
		<span className={startTime({ timing: late ? "late" : "onTime" })}>
			starts {formatSecondsSpan(starts)}
		</span>
	)
}
