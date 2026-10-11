import { ChevronDown } from "lucide-react"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/cn"
import type { CompareColumn, StatsRow } from "../lib/stats-rows"
import { compareColumn } from "./compare-column"
import { NoFixedValue } from "./no-fixed-value"
import { StatNumber } from "./stat-number"

type StatRowProps = {
	row: StatsRow
	/** Set while the forms are compared: the row shows both forms' totals, in these columns. */
	columns?: CompareColumn[]
	/** Shown under the row's name and total, inside its button (the source bar). */
	children?: React.ReactNode
}

/** A stats row: its total; tapping it opens the breakdown by source. */
export function StatRow({ row, columns, children }: StatRowProps) {
	const { info, next } = row

	if (info.noFixedValue) {
		return (
			<li className="flex min-h-7 items-center gap-2 rounded-md bg-line/40 px-2 py-0.75 text-xs leading-4 max-lg:min-h-10">
				<RowLabel row={row} />
				<span className="shrink-0 font-medium">
					<NoFixedValue label={info.label} description={info.description} />
				</span>
			</li>
		)
	}

	return (
		<li>
			<Collapsible>
				<CollapsibleTrigger
					className={cn(
						"group flex min-h-7 w-full flex-col justify-center rounded-md bg-line/40 px-2 py-0.75 text-left text-xs leading-4 outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-ring data-panel-open:rounded-b-none data-panel-open:bg-line max-lg:min-h-10",
						{ "bg-lilac/25": next !== undefined },
					)}
				>
					<span className="flex items-center gap-2">
						<RowLabel row={row} />
						{columns ? (
							<FormTotals row={row} columns={columns} />
						) : (
							<RowTotal row={row} />
						)}
						<ChevronDown
							aria-hidden="true"
							className="size-3.5 shrink-0 text-subtle transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none"
						/>
					</span>
					{children}
				</CollapsibleTrigger>
				{/* Base UI's own open/close states: a finite transition, so it unmounts once closed. */}
				<CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden rounded-b-md bg-surface-sunken/60 transition-[height,opacity] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
					<Breakdown row={row} />
				</CollapsibleContent>
			</Collapsible>
		</li>
	)
}

function RowLabel({ row }: { row: StatsRow }) {
	return (
		<>
			<img src={row.info.icon} alt="" className="size-4 shrink-0" />
			<span className="min-w-0 flex-1 text-prose">{row.info.label}</span>
		</>
	)
}

/** Both forms' totals side by side, the selected form's emphasized. */
function FormTotals({
	row,
	columns,
}: {
	row: StatsRow
	columns: CompareColumn[]
}) {
	const { total, comparedTotal, formDelta, valueFormat } = row

	return columns.map(({ name, selected }) => (
		<span
			key={name}
			className={compareColumn({
				column: selected ? selectedColumn(formDelta) : "compared",
			})}
		>
			<span className="sr-only">
				, {name}
				{selected && " (selected)"}:{" "}
			</span>
			{selected ? (
				<SelectedTotal row={row} />
			) : (
				<StatNumber
					value={comparedTotal ?? total}
					valueFormat={valueFormat}
					kind="total"
				/>
			)}
		</span>
	))
}

function selectedColumn(formDelta: number | undefined) {
	if (formDelta === undefined) return "selected"
	return formDelta > 0 ? "higher" : "lower"
}

/** The selected form's total; a preview's next total goes under it, so the column keeps its width. */
function SelectedTotal({ row }: { row: StatsRow }) {
	const { total, next, valueFormat } = row

	return (
		<span className="flex flex-col items-end">
			<StatNumber value={total} valueFormat={valueFormat} kind="total" />
			{next !== undefined && (
				<span
					className={cn("text-[0.625rem] text-success leading-3", {
						"text-error": next < total,
					})}
				>
					<span aria-hidden="true">→ </span>
					<span className="sr-only"> becomes </span>
					<StatNumber value={next} valueFormat={valueFormat} kind="total" />
				</span>
			)}
		</span>
	)
}

/** The total or, while previewing a change, `current → next`. */
function RowTotal({ row }: { row: StatsRow }) {
	const { total, next, valueFormat } = row

	return (
		<span className="shrink-0 font-medium tabular-nums">
			<StatNumber value={total} valueFormat={valueFormat} kind="total" />
			{next !== undefined && (
				<>
					<span aria-hidden="true"> → </span>
					<span className="sr-only"> becomes </span>
					<span
						className={cn("font-bold text-success", {
							"text-error": next < total,
						})}
					>
						<StatNumber value={next} valueFormat={valueFormat} kind="total" />
					</span>
				</>
			)}
		</span>
	)
}

/** Each source's part, then the total they add up to. */
function Breakdown({ row }: { row: StatsRow }) {
	const { parts, valueFormat, total, next } = row

	return (
		<dl className="flex flex-col gap-0.5 px-2 py-1.5 text-xs">
			{parts.map((part) => (
				<div key={part.id} className="flex justify-between gap-3">
					<dt className={cn("text-subtle", { "text-lilac": part.preview })}>
						{part.label}
						{part.preview && " · preview"}
					</dt>
					<dd className="shrink-0 tabular-nums">
						<StatNumber
							value={part.value}
							valueFormat={valueFormat}
							kind={part.kind === "base" ? "total" : "bonus"}
						/>
					</dd>
				</div>
			))}
			<div className="mt-0.5 flex justify-between gap-3 border-line border-t pt-1 font-semibold">
				<dt>{next === undefined ? "Total" : "Total with the preview"}</dt>
				<dd className="shrink-0 tabular-nums">
					<StatNumber
						value={next ?? total}
						valueFormat={valueFormat}
						kind="total"
					/>
				</dd>
			</div>
		</dl>
	)
}
