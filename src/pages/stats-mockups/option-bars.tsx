import { useState } from "react"
import { cn } from "@/lib/cn"
import { formatTotal } from "./lib/format-values"
import type { MockupRow, MockupRowGroup } from "./lib/mockup-rows"
import type { MockupStats } from "./lib/mockup-stats"
import { MockupStatsHeader } from "./mockup-stats-header"
import { RowTotal } from "./row-total"
import { SourceBar } from "./source-bar"
import { SourceLegend } from "./source-legend"

type OptionBarsProps = {
	groups: readonly MockupRowGroup[]
	previewLabel?: string
	comparison?: MockupStats["compared"]
}

/** Option 3: the total, a bar colored by source and a muted line naming each source's part; no tap needed. */
export function OptionBars({
	groups,
	previewLabel,
	comparison,
}: OptionBarsProps) {
	const [compare, setCompare] = useState(false)
	const comparedName = compare ? comparison?.comparedName : undefined

	return (
		<div className="flex flex-col gap-3">
			<MockupStatsHeader
				previewLabel={previewLabel}
				comparison={comparison}
				compare={compare}
				onCompareChange={setCompare}
			/>
			<SourceLegend compared={comparedName} />
			{groups.map(({ group, label, rows }) => (
				<div key={group}>
					<h4 className="pb-1 font-semibold text-gold text-xs uppercase tracking-widest">
						{label}
					</h4>
					<ul className="flex flex-col gap-0.5">
						{rows.map((row) => (
							<BarRow
								key={row.info.stat}
								row={row}
								comparedName={comparedName}
							/>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}

type BarRowProps = {
	row: MockupRow
	/** Set while the comparison is on: the bar marks that form's total. */
	comparedName?: string
}

function BarRow({ row, comparedName }: BarRowProps) {
	const { info, valueFormat, comparedTotal, next } = row
	const marker = comparedName ? comparedTotal : undefined

	return (
		<li
			className={cn("flex flex-col gap-1 rounded-md bg-line/40 px-2 py-1", {
				"bg-lilac/25": next !== undefined,
			})}
		>
			<div className="flex items-center gap-2 text-xs leading-4">
				<img src={info.icon} alt="" className="size-4 shrink-0" />
				<span className="min-w-0 flex-1 text-prose">{info.label}</span>
				{marker !== undefined && (
					<span className="text-subtle tabular-nums">
						{comparedName} {formatTotal(marker, valueFormat)}
						<span className="sr-only">, this form: </span>
					</span>
				)}
				<RowTotal {...row} />
			</div>
			<SourceBar row={row} comparedName={comparedName} />
		</li>
	)
}
