import { cn } from "@/lib/cn"
import type { MockupRow } from "./lib/mockup-rows"
import { rowBar, sourceLine, sourceTotals } from "./lib/source-summary"
import { sourceColor } from "./source-colors"

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
						<span
							key={kind}
							className={cn("absolute inset-y-0", sourceColor({ kind }))}
							style={{ left: `${start * 100}%`, width: `${width * 100}%` }}
						/>
					))}
					{lost && (
						<span
							className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,var(--color-error)_0_2px,var(--color-surface-sunken)_2px_4px)]"
							style={{
								left: `${lost.start * 100}%`,
								width: `${lost.width * 100}%`,
							}}
						/>
					)}
					{markerAt !== undefined && (
						<span
							className="absolute inset-y-0 w-0.5 bg-white"
							style={{ left: `calc(${markerAt * 100}% - 1px)` }}
						/>
					)}
				</span>
			)}
			{!!totals.length && (
				<span className="block text-[0.625rem] text-subtle tabular-nums leading-3">
					{sourceLine(totals, valueFormat)}
				</span>
			)}
		</>
	)
}
