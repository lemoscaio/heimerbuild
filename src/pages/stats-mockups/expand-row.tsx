import { ChevronDown } from "lucide-react"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/cn"
import type { MockupRow } from "./lib/mockup-rows"
import { useMockupMotion } from "./mockup-motion"
import { RowTotal } from "./row-total"
import { StatNumber } from "./stat-number"

type ExpandRowProps = {
	row: MockupRow
	/** Set while the comparison is on: the row shows its delta from that form. */
	comparedName?: string
	/** Shown under the row's name and total, inside the button (Option 4's source bar). */
	children?: React.ReactNode
}

/** A stats row that opens its composition by source: Options 1 and 4. */
export function ExpandRow({ row, comparedName, children }: ExpandRowProps) {
	const { info, formDelta, valueFormat, next } = row

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
									<StatNumber
										value={formDelta}
										valueFormat={valueFormat}
										kind="delta"
									/>
								)}
								<span className="sr-only">, total: </span>
							</span>
						)}
						<RowTotal {...row} />
						<ChevronDown
							aria-hidden="true"
							className="size-3.5 shrink-0 text-subtle transition-transform group-data-panel-open:rotate-180"
						/>
					</span>
					{children}
				</CollapsibleTrigger>
				<CollapsibleContent
					className={cn("rounded-b-md bg-surface-sunken/60", {
						// Base UI's own open/close states; it unmounts the panel once the transition ends.
						"h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none":
							useMockupMotion() === "animated",
					})}
				>
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
					<StatNumber value={total} valueFormat={valueFormat} kind="total" />
				</dd>
			</div>
		</dl>
	)
}
