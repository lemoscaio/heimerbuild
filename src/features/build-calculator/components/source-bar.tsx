import { Fragment } from "react"
import { cn } from "@/lib/cn"
import { rowBar, SOURCE_LABELS, sourceTotals } from "../lib/source-summary"
import type { StatsRow } from "../lib/stats-rows"
import { sourceColor } from "./source-colors"
import { StatNumber } from "./stat-number"
import { AnimatedBarSpan } from "./stats-panel.motion"

type SourceBarProps = {
	row: StatsRow
	/** Set while the forms are compared: the bar marks the other form's total. */
	comparedName?: string
}

/**
 * A row's bar colored by kind of source and the muted line naming each kind's part. Spans only,
 * so it sits inside the row's button and a screen reader reads the line after the total.
 */
export function SourceBar({ row, comparedName }: SourceBarProps) {
	const { parts, valueFormat, comparedTotal } = row
	const totals = sourceTotals(parts)
	const marker = comparedName ? comparedTotal : undefined
	const { segments, lost, markerAt } = rowBar(totals, { marker })

	return (
		<span className="flex flex-col gap-1 pt-1">
			{!!segments.length && (
				<span
					aria-hidden="true"
					className="relative block h-1.5 overflow-hidden rounded-full bg-surface-sunken"
				>
					{segments.map(({ kind, start, width }) => (
						<AnimatedBarSpan
							key={kind}
							className={cn("absolute inset-y-0", sourceColor({ kind }))}
							left={start}
							width={width}
						/>
					))}
					{lost && (
						<AnimatedBarSpan
							className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,var(--color-error)_0_2px,var(--color-surface-sunken)_2px_4px)]"
							left={lost.start}
							width={lost.width}
						/>
					)}
					{markerAt !== undefined && (
						<AnimatedBarSpan
							className="absolute inset-y-0 -ml-px w-0.5 bg-white"
							left={markerAt}
						/>
					)}
				</span>
			)}
			{!!totals.length && (
				<span className="block text-[0.625rem] text-subtle tabular-nums leading-3">
					{totals.map(({ kind, value }, index) => (
						<Fragment key={kind}>
							{!!index && " · "}
							<StatNumber
								value={value}
								valueFormat={valueFormat}
								kind={kind === "base" ? "total" : "bonus"}
							/>{" "}
							{SOURCE_LABELS[kind]}
						</Fragment>
					))}
				</span>
			)}
		</span>
	)
}
