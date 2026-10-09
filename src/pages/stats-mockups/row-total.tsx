import { cn } from "@/lib/cn"
import { formatTotal } from "./lib/format-values"
import type { MockupRow } from "./lib/mockup-rows"

type RowTotalProps = Pick<MockupRow, "breakdown" | "next" | "valueFormat">

/** The total or, while an item is previewed, `current → next`, as the Stats panel shows it today. */
export function RowTotal({ breakdown, next, valueFormat }: RowTotalProps) {
	const { total } = breakdown

	return (
		<span className="shrink-0 font-medium tabular-nums">
			{formatTotal(total, valueFormat)}
			{next !== undefined && (
				<>
					<span aria-hidden="true"> → </span>
					<span className="sr-only"> becomes </span>
					<span
						className={cn("font-bold text-success", {
							"text-error": next < total,
						})}
					>
						{formatTotal(next, valueFormat)}
					</span>
				</>
			)}
		</span>
	)
}
