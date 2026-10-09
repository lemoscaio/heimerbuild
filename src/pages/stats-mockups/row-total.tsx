import { cn } from "@/lib/cn"
import type { MockupRow } from "./lib/mockup-rows"
import { StatNumber } from "./stat-number"

type RowTotalProps = Pick<MockupRow, "breakdown" | "next" | "valueFormat">

/** The total or, while an item is previewed, `current → next`, as the Stats panel shows it today. */
export function RowTotal({ breakdown, next, valueFormat }: RowTotalProps) {
	const { total } = breakdown

	return (
		<span className="shrink-0 font-medium tabular-nums">
			<StatNumber value={total} valueFormat={valueFormat} kind="total" />
			{next !== undefined && (
				<>
					<span aria-hidden="true"> → </span>
					<span className="sr-only"> becomes </span>
					<span
						className={cn("font-bold text-success", {
							"text-error": next < total,
						})}
					>
						<StatNumber value={next} valueFormat={valueFormat} kind="total" />
					</span>
				</>
			)}
		</span>
	)
}
