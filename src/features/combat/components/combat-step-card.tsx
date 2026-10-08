import { CircleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { formatDamage, formatSeconds } from "../lib/combat-format"
import { FROM_MARKER, type StepView } from "../lib/combat-view"
import { CombatDamageOverTimeLine } from "./combat-damage-over-time-line"
import { CombatHitLine } from "./combat-hit-line"
import { CombatRunningEffects } from "./combat-running-effects"
import { CombatTargetResists } from "./combat-target-resists"
import { damageTypeText } from "./damage-type-styles"

type CombatStepCardProps = {
	/** 1-based, among the actions (markers aren't counted). */
	number: number
	label: string
	icon: React.ReactNode
	/** When it ran, shown first; absent while the build loads. */
	time?: number
	/** Why it did not run; the totals leave it out. */
	refused?: string
	view?: StepView
	/** Its "Move up" and "Move down" buttons (`CombatMoveButtons`). */
	moves: React.ReactNode
	onRemove: () => void
	/** Extra parts of the step: a wait's length, its input, its outcomes. */
	children?: React.ReactNode
} & React.ComponentProps<"li">

/** The target's health after the step, as a thin bar. */
function HealthBar({ share }: { share: number }) {
	const percent = Math.round(share * 100)
	return (
		<span
			role="img"
			aria-label={`Target health ${percent}%`}
			className="block h-1 overflow-hidden rounded-full bg-surface-raised"
		>
			<span
				className="block h-full bg-health"
				style={{ width: `${percent}%` }}
			/>
		</span>
	)
}

/**
 * A step of the combo: time, action, marks, its hits and damage over time, effects running, the
 * target's reduced resistances and its health.
 */
export function CombatStepCard({
	number,
	label,
	icon,
	time,
	refused,
	view,
	moves,
	onRemove,
	children,
	className,
	...props
}: CombatStepCardProps) {
	const title = `${number}. ${label}`
	return (
		<li
			className={cn(
				"grid grid-cols-[auto_auto_1fr_auto_auto] items-start gap-x-2 rounded-lg border border-line bg-surface-sunken px-1 py-1.5",
				{ "border-error/70": !!refused },
				className,
			)}
			{...props}
		>
			{moves}
			<span className={cn("pt-0.5", { "opacity-50": !!refused })}>{icon}</span>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="flex flex-wrap items-baseline gap-x-2 text-white text-xs">
					{time !== undefined && (
						<span className="font-bold font-display text-sm tabular-nums">
							{formatSeconds(time)}
						</span>
					)}
					<span className="font-semibold">{title}</span>
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
				{children}
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
				{!refused && view && <CombatRunningEffects effects={view.effects} />}
				{view && !refused && <CombatTargetResists resists={view.resists} />}
				{view && !refused && <HealthBar share={view.healthShare} />}
			</div>
			<p className="flex flex-col items-end text-right">
				{view && view.total.final > 0 && (
					<>
						<span
							className={cn(
								"font-bold font-display text-base tabular-nums",
								view.mainType && damageTypeText(view.mainType),
							)}
						>
							{formatDamage(view.total.final)}
						</span>
						<span className="text-[0.625rem] text-subtle tabular-nums">
							raw {formatDamage(view.total.raw)}
						</span>
					</>
				)}
			</p>
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
