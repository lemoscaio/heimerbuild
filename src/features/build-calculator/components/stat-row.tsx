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
	const { base, bonus, total } = breakdown

	return (
		<li
			className={cn(
				"my-1 flex items-center gap-1.5 text-xs leading-4",
				className,
			)}
			{...props}
		>
			<img src={icon} alt="" className="size-4 shrink-0" />
			<div>
				{label}: {formatStat(total, format)}
				{suffix}
				{bonus !== 0 && (
					<>
						{" "}
						({formatStat(base, format)} +{" "}
						<span className="text-success">{formatStat(bonus, format)}</span>)
					</>
				)}
			</div>
		</li>
	)
}
