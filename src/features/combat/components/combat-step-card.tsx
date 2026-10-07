import { ChevronRight, CircleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/cn"
import {
	DAMAGE_TYPE_NAMES,
	formatDamage,
	formatSeconds,
} from "../lib/combat-format"
import {
	type DamageOverTimeView,
	FROM_MARKER,
	type HitView,
	type StepView,
	type TickView,
} from "../lib/combat-view"
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

/** One line per source: "Harrier · 45 physical (raw 76)", "Toxic Shot · 30 magic", or why it has no number. */
function HitLine({ hit }: { hit: HitView }) {
	if ("notModeled" in hit) {
		return (
			<li className="text-warning">
				{hit.name} · not modeled: {hit.notModeled.join("; ")}
			</li>
		)
	}
	return (
		<li>
			{hit.name}
			{hit.count > 1 && ` ×${hit.count}`} ·{" "}
			<span className={damageTypeText(hit.type)}>
				{formatDamage(hit.final)} {DAMAGE_TYPE_NAMES[hit.type]}
			</span>{" "}
			<span className="text-subtle">(raw {formatDamage(hit.raw)})</span>
		</li>
	)
}

/** "1.00 s · 20 magic", or why the tick has no number. */
function TickLine({ tick }: { tick: TickView }) {
	return (
		<li className="tabular-nums">
			{formatSeconds(tick.time)} ·{" "}
			{"type" in tick ? (
				<span className={damageTypeText(tick.type)}>
					{formatDamage(tick.final)} {DAMAGE_TYPE_NAMES[tick.type]}
				</span>
			) : (
				<span className="text-warning">
					not modeled: {tick.notModeled.join("; ")}
				</span>
			)}
		</li>
	)
}

/** One part of a damage over time line, never broken across lines ("until 4.00 s"). */
function Segment({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"whitespace-nowrap not-last-of-type:after:content-['_·']",
				className,
			)}
			{...props}
		/>
	)
}

/** The line's parts: "Noxious Trap", "detonates at 3.45 s", "refreshed", "4 ticks", "120 magic", "until 7.45 s". */
function DamageOverTimeText({ dot }: { dot: DamageOverTimeView }) {
	const count = dot.ticks.length
	return (
		<>
			<Segment>
				{dot.name}
				{dot.stacks > 1 && ` (${dot.stacks} stacks)`}
			</Segment>
			{dot.delayed && (
				<Segment>
					{dot.delayed.label} at {formatSeconds(dot.delayed.at)}
				</Segment>
			)}
			{dot.application !== "applied" && <Segment>{dot.application}</Segment>}
			{!!count && (
				<Segment>
					{count} {count === 1 ? "tick" : "ticks"}
				</Segment>
			)}
			{dot.type && dot.final > 0 && (
				<Segment className={damageTypeText(dot.type)}>
					{formatDamage(dot.final)} {DAMAGE_TYPE_NAMES[dot.type]}
				</Segment>
			)}
			{!!dot.notModeled.length && (
				<Segment className="whitespace-normal text-warning">
					not modeled: {dot.notModeled.join("; ")}
				</Segment>
			)}
			<Segment>until {formatSeconds(dot.until)}</Segment>
		</>
	)
}

/**
 * "Toxic Shot · 4 ticks · 120 magic · until 4.00 s", a refresh or a stack first when it was one,
 * with its ticks listed on demand. A side effect of its step: no move or remove of its own.
 */
function DamageOverTimeLine({ dot }: { dot: DamageOverTimeView }) {
	return (
		<li>
			<Collapsible>
				<p className="flex flex-wrap items-baseline gap-x-1">
					<DamageOverTimeText dot={dot} />
					{!!dot.ticks.length && (
						<CollapsibleTrigger
							aria-label={`${dot.name} ticks`}
							className="group inline-flex items-center gap-0.5 whitespace-nowrap text-lilac max-lg:py-1"
						>
							<ChevronRight
								aria-hidden="true"
								className="size-3 transition-transform group-data-panel-open:rotate-90"
							/>
							ticks
						</CollapsibleTrigger>
					)}
				</p>
				<CollapsibleContent>
					<ol
						aria-label={`${dot.name} ticks`}
						className="mt-0.5 ml-3 flex flex-col text-subtle"
					>
						{dot.ticks.map((tick) => (
							<TickLine key={tick.time} tick={tick} />
						))}
					</ol>
				</CollapsibleContent>
			</Collapsible>
		</li>
	)
}

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

/** A step of the combo: time, action, marks, its hits and damage over time, effects running and the target's health. */
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
							<HitLine key={index} hit={hit} />
						))}
					</ul>
				)}
				{!!view?.damageOverTime.length && (
					<ul
						aria-label="Damage over time"
						className="flex flex-col text-[0.6875rem] text-prose"
					>
						{view.damageOverTime.map((dot) => (
							<DamageOverTimeLine key={dot.effectId} dot={dot} />
						))}
					</ul>
				)}
				{!refused && !!view?.effects.length && (
					<ul aria-label="Effects running" className="flex flex-wrap gap-1">
						{view.effects.map(({ name, until, paused }) => (
							<li
								key={`${name}@${until}`}
								className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[0.625rem] text-prose"
							>
								{name}
								{until !== undefined && ` · until ${formatSeconds(until)}`}
								{paused &&
									` · ${paused.label} paused until ${formatSeconds(paused.until)}`}
							</li>
						))}
					</ul>
				)}
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
