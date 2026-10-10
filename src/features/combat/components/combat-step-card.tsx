import { CircleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { type CombatRow, damageParts } from "../lib/combat-rows"
import { FROM_MARKER, type StepView } from "../lib/combat-view"
import { CombatDamageAmount } from "./combat-damage-amount"
import { CombatDamageOverTimeLine } from "./combat-damage-over-time-line"
import { CombatDamageSubline } from "./combat-damage-subline"
import { CombatHitLine } from "./combat-hit-line"
import { CombatLandTime } from "./combat-land-time"
import { CombatRunningEffects } from "./combat-running-effects"
import { CombatRunningTotal } from "./combat-running-total"
import { CombatStartTime } from "./combat-start-time"
import { CombatTargetResists } from "./combat-target-resists"

type CombatStepCardProps = {
	/** "1. E · Counter Strike": its number among the actions and its action. */
	title: string
	icon: React.ReactNode
	/** When it starts and lands, the running total and the target's health; absent while the build loads. */
	row?: CombatRow
	/** Why it did not run; the totals leave it out. */
	refused?: string
	view?: StepView
	/** Its "Move up" and "Move down" buttons (`CombatMoveButtons`). */
	moves: React.ReactNode
	onRemove: () => void
	/** Its inputs under its name: a wait's length, an ability's variant. */
	inputs?: React.ReactNode
	/** Its outcomes, after its hits. */
	outcomes?: React.ReactNode
} & React.ComponentProps<"li">

/**
 * A step of the combo as a card, with what its expanded row shows (issue 405): when it lands and
 * starts, its own hits and damage over time (its procs are entries of their own), outcomes,
 * effects running, the target's resists, its damage with its parts and the running total.
 */
export function CombatStepCard({
	title,
	icon,
	row,
	refused,
	view,
	moves,
	onRemove,
	inputs,
	outcomes,
	className,
	...props
}: CombatStepCardProps) {
	const shown = view && !refused
	return (
		<li
			className={cn(
				"grid grid-cols-[auto_auto_1fr_auto_auto] items-start gap-x-2 rounded-lg border border-line bg-surface-sunken px-1 py-1.5",
				{ "border-error/70": !!refused, "bg-surface-raised": !!row?.late },
				className,
			)}
			{...props}
		>
			{moves}
			<span className={cn("pt-0.5", { "opacity-50": !!refused })}>{icon}</span>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="flex flex-wrap items-baseline gap-x-2 text-white text-xs">
					{row && <CombatLandTime lands={row.lands} />}
					<span className="font-semibold">{title}</span>
					{row && (
						<CombatStartTime
							starts={{ first: row.startsAt, last: row.startsAt }}
							late={row.late}
						/>
					)}
					{view?.marks.map(({ mark, change, fromMarker }) => (
						<span key={`${mark}-${change}`} className="text-gold">
							{mark} mark {change}
							{fromMarker && ` ${FROM_MARKER}`}
						</span>
					))}
				</p>
				{refused && (
					<p className="flex items-start gap-1 text-error text-xs">
						<CircleAlert
							aria-hidden="true"
							className="mt-0.5 size-3 shrink-0"
						/>
						{refused} (left out)
					</p>
				)}
				{inputs}
				{!!view?.hits.length && (
					<ul
						aria-label="Hits"
						className="flex flex-col text-[0.6875rem] text-prose"
					>
						{view.hits.map((hit, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: a step's hits never reorder
							<CombatHitLine key={index} hit={hit} />
						))}
					</ul>
				)}
				{!!view?.damageOverTime.length && (
					<ul
						aria-label="Damage over time"
						className="flex flex-col text-[0.6875rem] text-prose"
					>
						{view.damageOverTime.map((dot) => (
							<CombatDamageOverTimeLine key={dot.effectId} dot={dot} />
						))}
					</ul>
				)}
				{shown && outcomes}
				{shown && <CombatRunningEffects effects={view.effects} />}
				{shown && <CombatTargetResists resists={view.resists} />}
				{shown && row && (
					<CombatRunningTotal
						dealt={row.dealt}
						targetHealth={row.targetHealth}
						healthShare={row.healthShare}
					/>
				)}
			</div>
			<div className="flex flex-col items-end">
				{view && view.total.final > 0 && (
					<CombatDamageAmount final={view.total.final} parts={view.byType}>
						<CombatDamageSubline
							raw={view.total.raw}
							parts={damageParts(view)}
						/>
					</CombatDamageAmount>
				)}
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove step ${title}`}
				onClick={onRemove}
				className="max-lg:size-11"
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}
