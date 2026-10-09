import { cva } from "class-variance-authority"
import { useState } from "react"
import { cn } from "@/lib/cn"
import { formatTotal } from "./lib/format-values"
import type { MockupRow, MockupRowGroup } from "./lib/mockup-rows"
import type { MockupStats } from "./lib/mockup-stats"
import {
	rowBar,
	SOURCE_KINDS,
	SOURCE_LABELS,
	type SourceKind,
	sourceLine,
	sourceTotals,
} from "./lib/source-summary"
import { MockupStatsHeader } from "./mockup-stats-header"
import { RowTotal } from "./row-total"

const sourceColor = cva("", {
	variants: {
		kind: {
			base: "bg-line-strong",
			level: "bg-subtle",
			form: "bg-physical",
			item: "bg-gold",
			shards: "bg-lilac",
			ranks: "bg-magic",
			effect: "bg-health",
			preview:
				"bg-[repeating-linear-gradient(135deg,var(--color-lilac)_0_3px,transparent_3px_6px)]",
		} satisfies Record<SourceKind, string>,
	},
})

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

function SourceLegend({ compared }: { compared?: string }) {
	return (
		<ul
			aria-label="Bar colors"
			className="flex flex-wrap gap-x-3 gap-y-1 text-[0.625rem] text-subtle"
		>
			{SOURCE_KINDS.map((kind) => (
				<li key={kind} className="flex items-center gap-1">
					<span className={cn("size-2 rounded-xs", sourceColor({ kind }))} />
					{SOURCE_LABELS[kind]}
				</li>
			))}
			{compared && (
				<li className="flex items-center gap-1">
					<span className="h-2.5 w-0.5 bg-white" />
					{compared}
				</li>
			)}
		</ul>
	)
}

type BarRowProps = {
	row: MockupRow
	/** Set while the comparison is on: the bar marks that form's total. */
	comparedName?: string
}

function BarRow({ row, comparedName }: BarRowProps) {
	const { info, parts, valueFormat, comparedTotal, next } = row
	const totals = sourceTotals(parts)
	const marker = comparedName ? comparedTotal : undefined
	const { segments, lost, markerAt } = rowBar(totals, { marker })

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
			{!!segments.length && (
				<div
					aria-hidden="true"
					className="relative h-1.5 overflow-hidden rounded-full bg-surface-sunken"
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
				</div>
			)}
			{!!totals.length && (
				<p className="text-[0.625rem] text-subtle tabular-nums leading-3">
					{sourceLine(totals, valueFormat)}
				</p>
			)}
		</li>
	)
}
