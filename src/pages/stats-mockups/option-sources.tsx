import { useId, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { CompareColumnsHeader } from "./compare-columns-header"
import { ExpandRow } from "./expand-row"
import type { MockupRowGroup } from "./lib/mockup-rows"
import type { MockupStats } from "./lib/mockup-stats"
import { MockupStatsHeader } from "./mockup-stats-header"
import { SourceBar } from "./source-bar"
import { SourceLegend } from "./source-legend"

type OptionSourcesProps = {
	groups: readonly MockupRowGroup[]
	previewLabel?: string
	comparison?: MockupStats["compared"]
}

/**
 * Option 4: Option 1's rows (the total, tap for each source's part) and a "Show sources" switch,
 * off by default, that adds Option 3's bar and line by kind of source under every row.
 */
export function OptionSources({
	groups,
	previewLabel,
	comparison,
}: OptionSourcesProps) {
	const [compare, setCompare] = useState(false)
	const [showSources, setShowSources] = useState(false)
	const sourcesId = useId()
	const comparedName = compare ? comparison?.comparedName : undefined

	return (
		<div className="flex flex-col gap-3">
			<MockupStatsHeader
				previewLabel={previewLabel}
				comparison={comparison}
				compare={compare}
				onCompareChange={setCompare}
			/>
			<div className="-mt-2 flex min-h-9 items-center gap-2.5 text-prose text-xs">
				<Switch
					id={sourcesId}
					checked={showSources}
					onCheckedChange={setShowSources}
				/>
				<label htmlFor={sourcesId} className="cursor-pointer">
					Show sources
				</label>
			</div>
			{showSources && <SourceLegend compared={comparedName} />}
			{comparedName && <CompareColumnsHeader comparedName={comparedName} />}
			{groups.map(({ group, label, rows }) => (
				<div key={group}>
					<h4 className="pb-1 font-semibold text-gold text-xs uppercase tracking-widest">
						{label}
					</h4>
					<ul className="flex flex-col gap-0.5">
						{rows.map((row) => (
							<ExpandRow
								key={row.info.stat}
								row={row}
								comparedName={comparedName}
							>
								{showSources && (
									<SourceBar row={row} comparedName={comparedName} />
								)}
							</ExpandRow>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}
