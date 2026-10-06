import { cn } from "@/lib/cn"
import { formatSeconds } from "../lib/combat-format"
import type { CombatTotals } from "../lib/combat-view"

type CombatClosingLineProps = {
	totals: Pick<CombatTotals, "duration" | "activeUntil">
} & React.ComponentProps<"p">

/** After the last step: when the last damage landed, and until when effects still run. */
export function CombatClosingLine({
	totals,
	className,
	...props
}: CombatClosingLineProps) {
	const { duration, activeUntil } = totals
	return (
		<p
			className={cn(
				"flex flex-wrap items-baseline gap-x-2 border-line border-t border-dashed px-2 pt-1.5 text-subtle text-xs",
				className,
			)}
			{...props}
		>
			<span>
				Last damage at{" "}
				<span className="font-bold font-display text-sm text-white tabular-nums">
					{formatSeconds(duration)}
				</span>
			</span>
			{activeUntil > duration && (
				<span>· effects active until {formatSeconds(activeUntil)}</span>
			)}
		</p>
	)
}
