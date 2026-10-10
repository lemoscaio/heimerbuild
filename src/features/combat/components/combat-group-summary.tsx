import { cva } from "class-variance-authority"
import { CircleAlert } from "lucide-react"
import { cn } from "@/lib/cn"
import {
	DAMAGE_TYPE_NAMES,
	formatDamage,
	formatSeconds,
} from "../lib/combat-format"
import type {
	GroupCount,
	GroupDamageOverTime,
	GroupView,
} from "../lib/combat-groups"
import { CombatTargetResists } from "./combat-target-resists"
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

type CombatGroupSummaryProps = {
	view: GroupView
} & React.ComponentProps<"div">

/**
 * What a collapsed group's steps did, counted (issue 331, option A), in both views: its marks, the
 * steps refused, its outcomes, damage over time, effects running and the target's resists.
 */
export function CombatGroupSummary({
	view,
	className,
	...props
}: CombatGroupSummaryProps) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1", className)} {...props}>
			{!!view.marks.length && (
				<p className="flex flex-wrap gap-x-2 text-gold text-xs">
					{view.marks.map((mark) => (
						<span key={mark.label}>{countText(mark)}</span>
					))}
				</p>
			)}
			{!!view.refused && (
				<p className="flex items-start gap-1 text-error text-xs">
					<CircleAlert aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
					{view.refused} refused (left out)
				</p>
			)}
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
			<CombatTargetResists resists={view.resists} />
		</div>
	)
}
