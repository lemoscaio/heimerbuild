import { cva } from "class-variance-authority"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import { formatDamage, formatSeconds } from "../lib/combat-format"
import type { ProcRow } from "../lib/combat-rows"
import { loneProcHit, type ProcView } from "../lib/combat-view"
import { CombatDamageAmount } from "./combat-damage-amount"
import { CombatHitDamage } from "./combat-hit-damage"
import { CombatHitLine } from "./combat-hit-line"
import { STEP_ROW_GRID } from "./combat-step-row"

/** Highlighted when it lands after the next step started, like a step's row. */
const procRow = cva(
	cn(
		STEP_ROW_GRID,
		"ml-10 items-start rounded-md border border-lilac/60 border-dashed px-4 py-1.5 text-xs",
	),
	{
		variants: {
			timing: { late: "bg-surface-raised", onTime: "" },
		},
	},
)

/** Hidden until read: what a cell's number is, as the header says it. */
function CellLabel({ children }: { children: string }) {
	return <span className="sr-only">{children} </span>
}

type CombatProcRowProps = {
	proc: ProcView
	/** Its timing and the running total down to it; absent while the rows load. */
	timing?: ProcRow
	/** The step that triggered it: "1. Q · Disintegrate". */
	from: string
} & React.ComponentProps<"li">

/**
 * A separate instance as a row of its own among the steps (issue 429), at its land time: when it
 * lands, its effect and the step it came from, its hits and damage, the running total.
 */
export function CombatProcRow({
	proc,
	timing,
	from,
	className,
	...props
}: CombatProcRowProps) {
	const lone = loneProcHit(proc)
	return (
		<li
			className={cn(
				procRow({ timing: timing?.late ? "late" : "onTime" }),
				className,
			)}
			{...props}
		>
			<span className="font-bold text-white tabular-nums [grid-area:lands]">
				<CellLabel>Lands</CellLabel>
				{formatSeconds(proc.time)}
			</span>
			<div className="flex min-w-0 flex-col pl-2 text-prose [grid-area:step]">
				<p className="flex min-w-0 items-center gap-2">
					<span aria-hidden="true" className="text-subtle">
						↳
					</span>
					<GameIcon
						name={proc.name}
						src={proc.icon}
						className="size-5 shrink-0 rounded-sm"
					/>
					<span className="min-w-0">{proc.name}</span>
				</p>
				<p className="pl-5 text-subtle">from {from}</p>
			</div>
			{lone ? (
				<p className="min-w-0 text-prose [grid-area:hits]">
					<CombatHitDamage hit={lone} />
				</p>
			) : (
				<ul
					aria-label={`${proc.name} hits`}
					className="flex min-w-0 flex-col text-prose [grid-area:hits]"
				>
					{proc.hits.map((hit, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a proc's hits never reorder
						<CombatHitLine key={index} hit={hit} />
					))}
				</ul>
			)}
			{proc.total.final > 0 && (
				<div className="flex flex-col items-end [grid-area:damage]">
					<CellLabel>Damage</CellLabel>
					<CombatDamageAmount
						final={proc.total.final}
						parts={proc.byType}
						size="sm"
					/>
				</div>
			)}
			{timing && (
				<>
					<span className="text-right text-prose tabular-nums [grid-area:dealt]">
						<CellLabel>So far</CellLabel>
						{formatDamage(timing.dealt)}
					</span>
					<span className="text-health tabular-nums [grid-area:health]">
						<CellLabel>Target health</CellLabel>
						{formatDamage(timing.targetHealth)}
					</span>
				</>
			)}
		</li>
	)
}
