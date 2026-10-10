import { cva } from "class-variance-authority"
import { formatSecondsSpan } from "../lib/combat-format"

/** Gold when one of its hits lands after the next step started. */
const starts = cva("text-prose tabular-nums [grid-area:starts]", {
	variants: {
		timing: {
			late: "text-gold",
			onTime: "",
		},
	},
})

type CombatRowStartsProps = {
	/** A step's start, or a group's first and last starts. */
	starts: { first: number; last: number }
	late: boolean
}

/** A row's "Starts" cell: "starts 0.00 s" in a narrow panel, its own column from 56rem. */
export function CombatRowStarts({ starts: at, late }: CombatRowStartsProps) {
	return (
		<span className={starts({ timing: late ? "late" : "onTime" })}>
			<span className="sr-only">Starts </span>
			<span aria-hidden="true" className="@4xl:hidden text-subtle">
				starts{" "}
			</span>
			{formatSecondsSpan(at)}
		</span>
	)
}
