import { cva } from "class-variance-authority"
import { CircleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import {
	formatDamage,
	formatSeconds,
	formatSecondsRange,
} from "../lib/combat-format"
import type { CombatRow, ProcRow } from "../lib/combat-rows"
import { damageParts } from "../lib/combat-rows"
import { FROM_MARKER, type ProcView, type StepView } from "../lib/combat-view"
import { CombatDamageOverTimeLine } from "./combat-damage-over-time-line"
import { CombatHitLine } from "./combat-hit-line"
import { CombatProcRow } from "./combat-proc-row"
import { CombatRunningEffects } from "./combat-running-effects"
import { CombatTargetResists } from "./combat-target-resists"
import { damageTypeText } from "./damage-type-styles"

/**
 * The rows' columns, shared with the header: in a narrow panel the start sits under the landing, the
 * hits under the step and the running total under the damage; from 56rem each has its own column.
 */
export const STEP_ROW_GRID =
	"grid grid-cols-[1.75rem_4.5rem_minmax(0,1fr)_4.5rem_6.5rem_1.75rem] grid-rows-[auto_1fr] gap-x-3 gap-y-1 [grid-template-areas:'moves_lands_step_damage_health_remove''moves_starts_hits_dealt_health_remove'] @4xl:grid-cols-[1.75rem_4rem_11rem_4rem_minmax(0,1fr)_4rem_4rem_7rem_1.75rem] @4xl:grid-rows-1 @4xl:[grid-template-areas:'moves_lands_step_starts_hits_damage_dealt_health_remove']"

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

const starts = cva("text-prose tabular-nums [grid-area:starts]", {
	variants: {
		timing: {
			late: "text-gold",
			onTime: "",
		},
	},
})

/** Hidden until read: what a cell's number is, as the header says it. */
function CellLabel({ children }: { children: string }) {
	return <span className="sr-only">{children} </span>
}

/** When its hits land: "1.00 s", a range for several moments, a dash for none. */
function Lands({ lands }: { lands: CombatRow["lands"] }) {
	if (!lands) return <span className="text-subtle">–</span>
	return lands.first === lands.last
		? formatSeconds(lands.first)
		: formatSecondsRange(lands.first, lands.last)
}

/** The target's health after the row, as a short bar and its number. */
function HealthLeft({ health, share }: { health: number; share: number }) {
	const percent = Math.round(share * 100)
	return (
		<span className="flex items-center gap-2 [grid-area:health]">
			<CellLabel>Target health</CellLabel>
			<span
				aria-hidden="true"
				className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-raised"
			>
				<span
					className="block h-full bg-health"
					style={{ width: `${percent}%` }}
				/>
			</span>
			<span className="text-health tabular-nums">{formatDamage(health)}</span>
		</span>
	)
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
	/** The separate instances it triggered, each a mini row under it with its timing. */
	procs?: readonly { view: ProcView; row?: ProcRow }[]
} & React.ComponentProps<"li">

/**
 * A step of the expanded combo as one row: when it lands, the step and its inputs, when it starts,
 * its own hits and effects, its damage with its parts, the running total and the target's health;
 * then a mini row per separate instance it triggered.
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
	procs = [],
	className,
	...props
}: CombatStepRowProps) {
	const late = timing?.late ? "late" : "onTime"
	const parts = view ? damageParts(view) : []
	// Its own damage: its procs have their mini rows (the card's total counts them).
	const damage = timing?.damage ?? view?.total.final ?? 0
	return (
		<li className={className} {...props}>
			<div className={row({ timing: late })}>
				<div className="[grid-area:moves]">{moves}</div>
				{timing && (
					<>
						<span className="pt-0.5 font-bold font-display text-sm text-white tabular-nums [grid-area:lands]">
							<CellLabel>Lands</CellLabel>
							<Lands lands={timing.lands} />
						</span>
						<span className={starts({ timing: late })}>
							<CellLabel>Starts</CellLabel>
							<span aria-hidden="true" className="@4xl:hidden text-subtle">
								starts{" "}
							</span>
							{formatSeconds(timing.startsAt)}
						</span>
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
				{view && damage > 0 && (
					<p className="flex flex-col items-end text-right [grid-area:damage]">
						<CellLabel>Damage</CellLabel>
						<span
							className={cn(
								"font-bold font-display text-base tabular-nums",
								view.mainType && damageTypeText(view.mainType),
							)}
						>
							{formatDamage(damage)}
						</span>
						{!!parts.length && (
							<span className="text-[0.625rem] text-subtle tabular-nums">
								({parts.map(formatDamage).join(" + ")})
							</span>
						)}
					</p>
				)}
				{timing && !refused && (
					<>
						<span className="text-right text-prose tabular-nums [grid-area:dealt]">
							<CellLabel>So far</CellLabel>
							<span aria-hidden="true" className="@4xl:hidden text-subtle">
								so far{" "}
							</span>
							{formatDamage(timing.dealt)}
						</span>
						<HealthLeft
							health={timing.targetHealth}
							share={view?.healthShare ?? 0}
						/>
					</>
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
			</div>
			{!!procs.length && !refused && (
				<ul aria-label="Procs">
					{procs.map(({ view: proc, row: procTiming }) => (
						<CombatProcRow
							key={`${proc.effectId}@${proc.time}`}
							proc={proc}
							timing={procTiming}
						/>
					))}
				</ul>
			)}
		</li>
	)
}
