import { cn } from "@/lib/cn"
import type { StatBreakdown } from "@/lib/stats/compute-stats"
import { formatStat, type StatRowInfo } from "../lib/stats-info"

type StatRowProps = {
	info: StatRowInfo
	breakdown: StatBreakdown
} & React.ComponentProps<"li">

export function StatRow({
	info,
	breakdown,
	className,
	...props
}: StatRowProps) {
	const { label, icon, format, suffix } = info
	const { bonus, total } = breakdown

	return (
		<li
			className={cn(
				"flex items-center gap-2 rounded-md bg-primary-2/40 px-2 py-1 text-xs leading-4",
				className,
			)}
			{...props}
		>
			<img src={icon} alt="" className="size-4 shrink-0" />
			<span className="min-w-0 flex-1 text-prose">{label}</span>
			<span className="shrink-0 font-medium tabular-nums">
				{formatStat(total, format)}
				{suffix}
				{bonus !== 0 && (
					<span className="ml-1.5 text-success">
						{bonus > 0 && "+"}
						{formatStat(bonus, format)}
					</span>
				)}
			</span>
		</li>
	)
}
