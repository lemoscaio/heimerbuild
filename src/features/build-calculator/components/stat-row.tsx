import { cva } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { formatStat, type StatFormat } from "@/lib/stat-display"
import type { StatBreakdown } from "@/lib/stats/compute-stats"
import type { StatRowInfo } from "../lib/stats-info"
import { NoFixedValue } from "./no-fixed-value"

const deltaChipVariants = cva(
	"rounded-full bg-surface-sunken px-1.5 font-semibold text-[0.625rem] leading-4",
	{
		variants: {
			direction: {
				up: "text-success",
				down: "text-warning",
			},
		},
	},
)

type DeltaChipProps = {
	delta: number
	format: StatFormat | undefined
	/** The form the delta is measured against ("Mini Gnar"). */
	comparedWith: string
}

function DeltaChip({ delta, format, comparedWith }: DeltaChipProps) {
	return (
		<span
			title={`Compared with ${comparedWith}`}
			className={deltaChipVariants({ direction: delta > 0 ? "up" : "down" })}
		>
			{delta > 0 ? "+" : "\u2212"}
			{formatStat(Math.abs(delta), format)}
			<span className="sr-only"> vs {comparedWith}</span>
		</span>
	)
}

type StatRowProps = {
	info: StatRowInfo
	breakdown: StatBreakdown
	/** The total with the selected item added, when it differs. */
	next?: number
	/** How far the total is from another form's, when it differs. */
	formDelta?: { delta: number; comparedWith: string }
} & React.ComponentProps<"li">

export function StatRow({
	info,
	breakdown,
	next,
	formDelta,
	className,
	...props
}: StatRowProps) {
	const { label, icon, noFixedValue, description } = info

	return (
		<li
			className={cn(
				"flex items-center gap-2 rounded-md bg-line/40 px-2 py-0.75 text-xs leading-4",
				{ "bg-lilac/25": next !== undefined },
				className,
			)}
			{...props}
		>
			<img src={icon} alt="" className="size-4 shrink-0" />
			<span className="min-w-0 flex-1 text-prose">{label}</span>
			{formDelta && <DeltaChip format={info.format} {...formDelta} />}
			<span className="shrink-0 font-medium tabular-nums">
				{noFixedValue ? (
					<NoFixedValue label={label} description={description} />
				) : (
					<StatTotal info={info} breakdown={breakdown} next={next} />
				)}
			</span>
		</li>
	)
}

type StatTotalProps = Pick<StatRowProps, "info" | "breakdown" | "next">

/** The total, then its bonus or, with a candidate change, `current → next`. */
function StatTotal({ info, breakdown, next }: StatTotalProps) {
	const { format, suffix } = info
	const { bonus, total } = breakdown

	return (
		<>
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
		</>
	)
}
