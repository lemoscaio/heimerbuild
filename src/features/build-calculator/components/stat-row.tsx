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
			className={className ? `stats__stat ${className}` : "stats__stat"}
			{...props}
		>
			<img src={icon} alt="" className="stats__stat-icon" />
			<div className="stats__stat-numbers">
				{label}: {formatStat(total, format)}
				{suffix}
				{bonus !== 0 && (
					<>
						{" "}
						({formatStat(base, format)} +{" "}
						<span className="stats__stat--additional">
							{formatStat(bonus, format)}
						</span>
						)
					</>
				)}
			</div>
		</li>
	)
}
