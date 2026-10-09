import { cva } from "class-variance-authority"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import { formatDamage, formatSeconds } from "../lib/combat-format"
import type { ProcRow } from "../lib/combat-rows"
import { loneProcHit, type ProcView } from "../lib/combat-view"
import { CombatHitDamage } from "./combat-hit-damage"
import { CombatHitLine } from "./combat-hit-line"
import { STEP_ROW_GRID } from "./combat-step-row"
import { damageTypeText } from "./damage-type-styles"

/** Highlighted when it lands after the next step started, like a step's row. */
const procRow = cva(
	cn(STEP_ROW_GRID, "items-start border-line border-b px-4 py-1.5 text-xs"),
	{
		variants: {
			timing: { late: "bg-surface-raised", onTime: "" },
			place: {
				inside: "",
				outside: "ml-10 rounded-md border border-lilac/60 border-dashed",
			},
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
	/** PROTOTYPE (PR 434): the step that triggered it, for a proc listed among the steps ("1. Q · Disintegrate"). */
	from?: string
} & React.ComponentProps<"li">

/**
 * A separate instance's mini row (issue 429): when it lands, its effect, hits and damage, the
 * running total; under its step's row, or among the rows with the step it came from.
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
				procRow({
					timing: timing?.late ? "late" : "onTime",
					place: from ? "outside" : "inside",
				}),
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
				{from && <p className="pl-5 text-subtle">from {from}</p>}
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
				<p className="text-right [grid-area:damage]">
					<CellLabel>Damage</CellLabel>
					<span
						className={cn(
							"font-bold font-display text-sm tabular-nums",
							proc.mainType && damageTypeText(proc.mainType),
						)}
					>
						{formatDamage(proc.total.final)}
					</span>
				</p>
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
