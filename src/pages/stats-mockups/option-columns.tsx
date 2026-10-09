import { useState } from "react"
import { cn } from "@/lib/cn"
import {
	formatBonus,
	formatDelta,
	formatTotal,
	isZero,
} from "./lib/format-values"
import type { MockupRow, MockupRowGroup } from "./lib/mockup-rows"
import type { MockupStats } from "./lib/mockup-stats"
import { MockupStatsHeader } from "./mockup-stats-header"
import { RowTotal } from "./row-total"

type OptionColumnsProps = {
	groups: readonly MockupRowGroup[]
	previewLabel?: string
	comparison?: MockupStats["compared"]
}

/** Option 2: a table with Base, Bonus and Total columns; the form delta shows under the total behind a switch. */
export function OptionColumns({
	groups,
	previewLabel,
	comparison,
}: OptionColumnsProps) {
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
			<table className="w-full border-separate border-spacing-y-0.5 text-xs leading-4">
				<thead>
					<tr className="text-[0.625rem] text-subtle uppercase tracking-wider">
						<th scope="col" className="text-left font-normal">
							Stat
						</th>
						<HeaderCell>Base</HeaderCell>
						<HeaderCell>Bonus</HeaderCell>
						<HeaderCell>Total</HeaderCell>
					</tr>
				</thead>
				{groups.map(({ group, label, rows }) => (
					<tbody key={group}>
						<tr>
							<th
								scope="rowgroup"
								colSpan={4}
								className="pt-2 pb-0.5 text-left font-semibold text-gold uppercase tracking-widest"
							>
								{label}
							</th>
						</tr>
						{rows.map((row) => (
							<ColumnsRow
								key={row.info.stat}
								row={row}
								comparedName={comparedName}
							/>
						))}
					</tbody>
				))}
			</table>
		</div>
	)
}

function HeaderCell({ children }: React.PropsWithChildren) {
	return (
		<th scope="col" className="pl-2 text-right font-normal">
			{children}
		</th>
	)
}

/** A number cell; "—" stands for none, so a 0 never reads as a value. */
function NumberCell({ className, children }: React.ComponentProps<"td">) {
	return (
		<td
			className={cn(
				"whitespace-nowrap bg-line/40 py-0.75 pl-2 text-right tabular-nums last:rounded-r-md last:pr-2",
				className,
			)}
		>
			{children ?? (
				<>
					<span aria-hidden="true">—</span>
					<span className="sr-only">none</span>
				</>
			)}
		</td>
	)
}

type ColumnsRowProps = {
	row: MockupRow
	/** Set while the comparison is on: the total gets its delta from that form. */
	comparedName?: string
}

function ColumnsRow({ row, comparedName }: ColumnsRowProps) {
	const { info, breakdown, valueFormat, formDelta, next } = row
	const highlight = { "bg-lilac/25": next !== undefined }

	return (
		<tr>
			<th
				scope="row"
				className={cn(
					"rounded-l-md bg-line/40 py-0.75 pl-2 text-left font-normal text-prose",
					highlight,
				)}
			>
				<span className="flex items-center gap-2">
					<img src={info.icon} alt="" className="size-4 shrink-0" />
					{info.label}
				</span>
			</th>
			<NumberCell className={cn("text-subtle", highlight)}>
				{isZero(breakdown.base)
					? undefined
					: formatTotal(breakdown.base, valueFormat)}
			</NumberCell>
			<NumberCell className={cn("text-success", highlight)}>
				{isZero(breakdown.bonus)
					? undefined
					: formatBonus(breakdown.bonus, valueFormat)}
			</NumberCell>
			<NumberCell className={cn(highlight)}>
				<RowTotal {...row} />
				{comparedName && formDelta !== undefined && (
					<span className="block text-[0.625rem] text-subtle">
						{formatDelta(formDelta, valueFormat)} vs {comparedName}
					</span>
				)}
			</NumberCell>
		</tr>
	)
}
