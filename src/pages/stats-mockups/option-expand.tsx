import { ChevronDown } from "lucide-react"
import { useState } from "react"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/cn"
import { formatBonus, formatDelta, formatTotal } from "./lib/format-values"
import type { MockupRow, MockupRowGroup } from "./lib/mockup-rows"
import type { MockupStats } from "./lib/mockup-stats"
import { MockupStatsHeader } from "./mockup-stats-header"
import { RowTotal } from "./row-total"

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
			{comparedName && (
				<div
					aria-hidden="true"
					className="-mb-2 flex gap-2 px-2 text-[0.625rem] text-subtle uppercase tracking-wider"
				>
					<span className="flex-1" />
					<span className="w-16 whitespace-nowrap text-right">
						vs {comparedName}
					</span>
					<span className="w-17.5 text-right">Total</span>
				</div>
			)}
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

type ExpandRowProps = {
	row: MockupRow
	/** Set while the comparison is on: the row shows its delta from that form. */
	comparedName?: string
}

function ExpandRow({ row, comparedName }: ExpandRowProps) {
	const { info, formDelta, valueFormat, next } = row

	return (
		<li>
			<Collapsible>
				<CollapsibleTrigger
					className={cn(
						"group flex min-h-7 w-full items-center gap-2 rounded-md bg-line/40 px-2 py-0.75 text-left text-xs leading-4 outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-ring data-panel-open:rounded-b-none data-panel-open:bg-line max-lg:min-h-10",
						{ "bg-lilac/25": next !== undefined },
					)}
				>
					<img src={info.icon} alt="" className="size-4 shrink-0" />
					<span className="min-w-0 flex-1 text-prose">{info.label}</span>
					{comparedName && (
						<span className="w-16 shrink-0 text-right text-subtle tabular-nums">
							<span className="sr-only">, vs {comparedName}: </span>
							{formDelta === undefined ? (
								<>
									<span aria-hidden="true">=</span>
									<span className="sr-only">same</span>
								</>
							) : (
								formatDelta(formDelta, valueFormat)
							)}
							<span className="sr-only">, total: </span>
						</span>
					)}
					<RowTotal {...row} />
					<ChevronDown
						aria-hidden="true"
						className="size-3.5 shrink-0 text-subtle transition-transform group-data-panel-open:rotate-180"
					/>
				</CollapsibleTrigger>
				<CollapsibleContent className="rounded-b-md bg-surface-sunken/60">
					<Composition row={row} />
				</CollapsibleContent>
			</Collapsible>
		</li>
	)
}

/** Each source's part, then the total they add up to. */
function Composition({ row }: { row: MockupRow }) {
	const { parts, valueFormat, breakdown, next } = row
	const total = next ?? breakdown.total

	return (
		<dl className="flex flex-col gap-0.5 px-2 py-1.5 text-xs">
			{parts.map((part) => (
				<div
					key={`${part.kind}-${part.label}`}
					className="flex justify-between gap-3"
				>
					<dt className={cn("text-subtle", { "text-lilac": part.preview })}>
						{part.label}
						{part.preview && " · preview"}
					</dt>
					<dd className="shrink-0 tabular-nums">
						{part.kind === "base"
							? formatTotal(part.value, valueFormat)
							: formatBonus(part.value, valueFormat)}
					</dd>
				</div>
			))}
			<div className="mt-0.5 flex justify-between gap-3 border-line border-t pt-1 font-semibold">
				<dt>{next === undefined ? "Total" : "Total with the preview"}</dt>
				<dd className="shrink-0 tabular-nums">
					{formatTotal(total, valueFormat)}
				</dd>
			</div>
		</dl>
	)
}
