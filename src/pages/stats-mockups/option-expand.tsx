import { useState } from "react"
import { CompareColumnsHeader } from "./compare-columns-header"
import { ExpandRow } from "./expand-row"
import type { MockupRowGroup } from "./lib/mockup-rows"
import type { MockupStats } from "./lib/mockup-stats"
import { MockupStatsHeader } from "./mockup-stats-header"

type OptionExpandProps = {
	groups: readonly MockupRowGroup[]
	previewLabel?: string
	comparison?: MockupStats["compared"]
}

/** Option 1 (owner's proposal): one number per row; a row opens its composition; the forms compare behind a switch. */
export function OptionExpand({
	groups,
	previewLabel,
	comparison,
}: OptionExpandProps) {
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
							/>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}
