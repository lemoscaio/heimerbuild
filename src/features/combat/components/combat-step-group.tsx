import { cva } from "class-variance-authority"
import { ChevronDown, CircleAlert, X } from "lucide-react"
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
	formatSecondsRange,
} from "../lib/combat-format"
import type {
	GroupCount,
	GroupDamageOverTime,
	GroupView,
} from "../lib/combat-groups"
import { damageTypeText } from "./damage-type-styles"

/** Gold: what the rules computed, on some of the steps; quieter when on none. */
const outcomeCount = cva(
	"rounded-full border px-2 py-0.5 text-[0.625rem] leading-snug",
	{
		variants: {
			happened: {
				some: "border-outcome-line bg-outcome-fill text-outcome-ink",
				none: "border-line bg-surface text-subtle",
			},
		},
	},
)

type CombatStepGroupProps = {
	/** "1–8. Attack ×8" */
	title: string
	icon: React.ReactNode
	view: GroupView
	/** Free mode's answers inside that differ from the computed ones; none outside free mode. */
	changes?: number
	/** The group's "Move up" and "Move down" buttons (`CombatMoveButtons`). */
	moves: React.ReactNode
	open: boolean
	onOpenChange: (open: boolean) => void
	onRemove: () => void
	/** Its steps' cards, shown once open. */
	children: React.ReactNode
} & React.ComponentProps<"li">

/** "368 physical · 248 magic · 36 true" */
function DamageByType({ parts }: { parts: GroupView["byType"] }) {
	if (!parts.length) return null
	return (
		<p className="flex flex-wrap gap-x-1 text-[0.6875rem]">
			{parts.map(({ type, final }) => (
				<span
					key={type}
					className={cn(
						"whitespace-nowrap not-last:after:text-subtle not-last:after:content-['_·']",
						damageTypeText(type),
					)}
				>
					{formatDamage(final)} {DAMAGE_TYPE_NAMES[type]}
				</span>
			))}
		</p>
	)
}

function countText({ label, count, of }: GroupCount) {
	return `${label} ${count}/${of}`
}

/** One part of a damage over time line, never broken across lines. */
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

/** "Toxic Shot · applied · refreshed ×7 · 10 ticks · 240 magic · until 10.94 s" */
function DamageOverTimeLine({ dot }: { dot: GroupDamageOverTime }) {
	return (
		<li className="flex flex-wrap items-baseline gap-x-1">
			<Segment className="font-semibold text-white">{dot.name}</Segment>
			{dot.applications.map(({ application, count }) => (
				<Segment key={application}>
					{application}
					{count > 1 && ` ×${count}`}
				</Segment>
			))}
			{!!dot.ticks && (
				<Segment>
					{dot.ticks} {dot.ticks === 1 ? "tick" : "ticks"}
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
		</li>
	)
}

/**
 * A run of identical steps as one block (issue 331, option A): its time range, damage by type and
 * total, and what its steps did as counts ("Hail of Blades 3/8"). It moves and goes as a whole;
 * "Show steps" lists its steps, each with its own controls.
 */
export function CombatStepGroup({
	title,
	icon,
	view,
	changes,
	moves,
	open,
	onOpenChange,
	onRemove,
	children,
	className,
	...props
}: CombatStepGroupProps) {
	return (
		<li
			className={cn(
				"rounded-lg border border-lilac/70 bg-surface-sunken px-1 py-1.5 shadow-[inset_3px_0_0_var(--color-lilac)]",
				className,
			)}
			{...props}
		>
			<Collapsible
				open={open}
				onOpenChange={onOpenChange}
				className="flex flex-col gap-1.5"
			>
				<div className="grid grid-cols-[auto_auto_1fr_auto_auto] items-start gap-x-2">
					{moves}
					<span className="pt-0.5">{icon}</span>
					<div className="flex min-w-0 flex-col gap-1">
						<p className="flex flex-wrap items-baseline gap-x-2 text-white text-xs">
							{view.time && (
								<span className="font-bold font-display text-sm tabular-nums">
									{formatSecondsRange(view.time.from, view.time.to)}
								</span>
							)}
							<span className="font-semibold">{title}</span>
							{view.marks.map((mark) => (
								<span key={mark.label} className="text-gold">
									{countText(mark)}
								</span>
							))}
						</p>
						{!!view.refused && (
							<p className="flex items-start gap-1 text-error text-xs">
								<CircleAlert
									aria-hidden="true"
									className="mt-0.5 size-3 shrink-0"
								/>
								{view.refused} refused (left out)
							</p>
						)}
						<DamageByType parts={view.byType} />
						{!!view.outcomes.length && (
							<ul aria-label="Outcomes" className="flex flex-wrap gap-1">
								{view.outcomes.map((outcome) => (
									<li
										key={outcome.id}
										className={outcomeCount({
											happened: outcome.count ? "some" : "none",
										})}
									>
										{countText(outcome)}
									</li>
								))}
							</ul>
						)}
						{!!view.damageOverTime.length && (
							<ul
								aria-label="Damage over time"
								className="flex flex-col text-[0.6875rem] text-prose"
							>
								{view.damageOverTime.map((dot) => (
									<DamageOverTimeLine key={dot.effectId} dot={dot} />
								))}
							</ul>
						)}
						{!!view.effects.length && (
							<ul aria-label="Effects running" className="flex flex-wrap gap-1">
								{view.effects.map((effect) => (
									<li
										key={effect.label}
										className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[0.625rem] text-prose"
									>
										{countText(effect)}
									</li>
								))}
							</ul>
						)}
						<div className="flex flex-wrap items-center gap-2">
							<CollapsibleTrigger
								aria-label={`${open ? "Hide" : "Show"} steps of group ${title}`}
								className="group inline-flex w-fit items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[0.6875rem] text-lilac hover:border-lilac max-lg:py-1.5"
							>
								<ChevronDown
									aria-hidden="true"
									className="size-3 transition-transform group-data-panel-open:rotate-180"
								/>
								{open ? "Hide steps" : "Show steps"}
							</CollapsibleTrigger>
							{!!changes && (
								<span className="text-[0.6875rem] text-gold">
									● {changes} {changes === 1 ? "change" : "changes"} inside
								</span>
							)}
						</div>
					</div>
					<p className="flex flex-col items-end text-right">
						{view.total.final > 0 && (
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
						aria-label={`Remove group ${title}`}
						onClick={onRemove}
						className="max-lg:size-11"
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<CollapsibleContent>
					<ol
						aria-label={`Steps of group ${title}`}
						className="ml-1 flex flex-col gap-1.5 border-lilac/40 border-l pl-1.5 sm:ml-3 sm:pl-2"
					>
						{children}
					</ol>
				</CollapsibleContent>
			</Collapsible>
		</li>
	)
}
