import { cn } from "@/lib/cn"
import { formatStat } from "@/lib/stat-display"
import type { StatBreakdown } from "@/lib/stats/compute-stats"
import type { StatRowInfo } from "../lib/stats-info"

type StatRowProps = {
	info: StatRowInfo
	breakdown: StatBreakdown
	/** The total with the selected item added, when it differs. */
	next?: number
} & React.ComponentProps<"li">

export function StatRow({
	info,
	breakdown,
	next,
	className,
	...props
}: StatRowProps) {
	const { label, icon, format, suffix } = info
	const { bonus, total } = breakdown

	return (
		<li
			className={cn(
				"flex items-center gap-2 rounded-md bg-primary-2/40 px-2 py-0.75 text-xs leading-4",
				{ "bg-lilac/25": next !== undefined },
				className,
			)}
			{...props}
		>
			<img src={icon} alt="" className="size-4 shrink-0" />
			<span className="min-w-0 flex-1 text-prose">{label}</span>
			<span className="shrink-0 font-medium tabular-nums">
				{formatStat(total, format)}
				{suffix}
				{next === undefined ? (
					bonus !== 0 && (
						<span className="ml-1.5 text-success">
							{bonus > 0 && "+"}
							{formatStat(bonus, format)}
						</span>
					)
				) : (
					<>
						<span aria-hidden="true"> → </span>
						<span className="sr-only"> becomes </span>
						<span
							className={cn("font-bold text-success", {
								"text-error": next < total,
							})}
						>
							{formatStat(next, format)}
							{suffix}
						</span>
					</>
				)}
			</span>
		</li>
	)
}
