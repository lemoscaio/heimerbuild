import { cva } from "class-variance-authority"
import { CircleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { CombatRow } from "../lib/combat-rows"
import { damageParts } from "../lib/combat-rows"
import { FROM_MARKER, type StepView } from "../lib/combat-view"
import { CombatDamageAmount } from "./combat-damage-amount"
import { CombatDamageOverTimeLine } from "./combat-damage-over-time-line"
import { CombatDamageSubline } from "./combat-damage-subline"
import { CombatHitLine } from "./combat-hit-line"
import { CombatLandTime } from "./combat-land-time"
import { CombatRowStarts } from "./combat-row-starts"
import { CombatRowTotals } from "./combat-row-totals"
import { CombatRunningEffects } from "./combat-running-effects"
import { CombatTargetResists } from "./combat-target-resists"

/**
 * The rows' columns, shared with the header: in a narrow panel the start sits under the landing, the
 * hits under the step and the running total under the damage; from 56rem each has its own column.
 */
export const STEP_ROW_GRID =
	"grid grid-cols-[1.75rem_4.5rem_minmax(0,1fr)_4.5rem_6.5rem_1.75rem] grid-rows-[auto_1fr] gap-x-3 gap-y-1 [grid-template-areas:'moves_lands_step_damage_health_remove''moves_starts_hits_dealt_health_remove'] @4xl:grid-cols-[1.75rem_5.5rem_11rem_5rem_minmax(0,1fr)_4rem_4rem_7rem_1.75rem] @4xl:grid-rows-1 @4xl:[grid-template-areas:'moves_lands_step_starts_hits_damage_dealt_health_remove']"

const row = cva(
	cn(STEP_ROW_GRID, "items-start border-line border-b px-4 py-2.5 text-xs"),
	{
		variants: {
			timing: {
				late: "bg-surface-raised",
				onTime: "",
			},
		},
	},
)

/** Hidden until read: what a cell's number is, as the header says it. */
function CellLabel({ children }: { children: string }) {
	return <span className="sr-only">{children} </span>
}

/** What the step did: its marks, hits, damage over time, outcomes, running effects and the target's resists. */
function RowHits({
	view,
	outcomes,
}: {
	view: StepView
	outcomes: React.ReactNode
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1 [grid-area:hits]">
			{view.marks.map(({ mark, change, fromMarker }) => (
				<span key={`${mark}-${change}`} className="text-gold">
					{mark} mark {change}
					{fromMarker && ` ${FROM_MARKER}`}
				</span>
			))}
			{!!view.hits.length && (
				<ul aria-label="Hits" className="flex flex-col text-prose">
					{view.hits.map((hit, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a step's hits never reorder
						<CombatHitLine key={index} hit={hit} />
					))}
				</ul>
			)}
			{!!view.damageOverTime.length && (
				<ul aria-label="Damage over time" className="flex flex-col text-prose">
					{view.damageOverTime.map((dot) => (
						<CombatDamageOverTimeLine key={dot.effectId} dot={dot} />
					))}
				</ul>
			)}
			{outcomes}
			<CombatRunningEffects effects={view.effects} />
			<CombatTargetResists resists={view.resists} />
		</div>
	)
}

type CombatStepRowProps = {
	/** "1. E · Counter Strike": its number among the actions and its action. */
	title: string
	icon: React.ReactNode
	/** When it starts and lands and the running total; absent while the build loads. */
	row?: CombatRow
	view?: StepView
	/** Why it did not run; the totals leave it out. */
	refused?: string
	/** Its "Move up" and "Move down" buttons (`CombatMoveButtons`). */
	moves: React.ReactNode
	onRemove: () => void
	/** Its inputs under its name: a wait's length, an ability's variant. */
	inputs?: React.ReactNode
	/** Its outcomes, with its hits. */
	outcomes?: React.ReactNode
} & React.ComponentProps<"li">

/**
 * A step of the expanded combo as one row: when it lands, the step and its inputs, when it starts,
 * its own hits and effects (its procs are rows of their own), its damage with its parts, the
 * running total and the target's health.
 */
export function CombatStepRow({
	title,
	icon,
	row: timing,
	view,
	refused,
	moves,
	onRemove,
	inputs,
	outcomes,
	className,
	...props
}: CombatStepRowProps) {
	const late = timing?.late ? "late" : "onTime"
	const parts = view ? damageParts(view) : []
	return (
		<li className={cn(row({ timing: late }), className)} {...props}>
			<div className="[grid-area:moves]">{moves}</div>
			{timing && (
				<>
					<span className="pt-0.5 text-white [grid-area:lands]">
						<CombatLandTime lands={timing.lands} />
					</span>
					<CombatRowStarts
						starts={{ first: timing.startsAt, last: timing.startsAt }}
						late={timing.late}
					/>
				</>
			)}
			<div className="flex min-w-0 flex-col gap-1.5 [grid-area:step]">
				<p
					className={cn("flex items-center gap-2 font-semibold text-white", {
						"opacity-50": !!refused,
					})}
				>
					{icon}
					<span className="min-w-0">{title}</span>
				</p>
				{inputs}
				{refused && (
					<p className="flex items-start gap-1 text-error">
						<CircleAlert
							aria-hidden="true"
							className="mt-0.5 size-3 shrink-0"
						/>
						{refused} (left out)
					</p>
				)}
			</div>
			{view && !refused && <RowHits view={view} outcomes={outcomes} />}
			{view && view.total.final > 0 && (
				<div className="flex flex-col items-end [grid-area:damage]">
					<CellLabel>Damage</CellLabel>
					<CombatDamageAmount final={view.total.final} parts={view.byType}>
						<CombatDamageSubline raw={view.total.raw} parts={parts} />
					</CombatDamageAmount>
				</div>
			)}
			{timing && !refused && (
				<CombatRowTotals
					dealt={timing.dealt}
					targetHealth={timing.targetHealth}
					healthShare={timing.healthShare}
				/>
			)}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove step ${title}`}
				onClick={onRemove}
				className="[grid-area:remove]"
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}
