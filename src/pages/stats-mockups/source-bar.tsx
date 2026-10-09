import { Fragment } from "react"
import { cn } from "@/lib/cn"
import type { MockupRow } from "./lib/mockup-rows"
import { rowBar, SOURCE_LABELS, sourceTotals } from "./lib/source-summary"
import { useMockupMotion } from "./mockup-motion"
import { AnimatedBarSpan } from "./option-sources.motion"
import { sourceColor } from "./source-colors"
import { StatNumber } from "./stat-number"

type SourceBarProps = {
	row: MockupRow
	/** Set while the comparison is on: the bar marks that form's total. */
	comparedName?: string
}

/**
 * A row's bar colored by kind of source and the muted line naming each kind's part (Options 3 and 4).
 * Spans only, so it can sit inside Option 4's row button.
 */
export function SourceBar({ row, comparedName }: SourceBarProps) {
	const { parts, valueFormat, comparedTotal } = row
	const totals = sourceTotals(parts)
	const marker = comparedName ? comparedTotal : undefined
	const { segments, lost, markerAt } = rowBar(totals, { marker })

	return (
		<>
			{!!segments.length && (
				<span
					aria-hidden="true"
					className="relative block h-1.5 overflow-hidden rounded-full bg-surface-sunken"
				>
					{segments.map(({ kind, start, width }) => (
						<BarSpan
							key={kind}
							className={cn("absolute inset-y-0", sourceColor({ kind }))}
							left={start}
							width={width}
						/>
					))}
					{lost && (
						<BarSpan
							className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,var(--color-error)_0_2px,var(--color-surface-sunken)_2px_4px)]"
							left={lost.start}
							width={lost.width}
						/>
					)}
					{markerAt !== undefined && (
						<BarSpan
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
		</>
	)
}

type BarSpanProps = React.ComponentProps<typeof AnimatedBarSpan>

/** A segment or marker at its place on the bar; in Option 4 it glides there. */
function BarSpan({ left, width, className }: BarSpanProps) {
	if (useMockupMotion() === "animated") {
		return <AnimatedBarSpan left={left} width={width} className={className} />
	}
	return (
		<span
			className={className}
			style={{
				left: `${left * 100}%`,
				...(width !== undefined && { width: `${width * 100}%` }),
			}}
		/>
	)
}
