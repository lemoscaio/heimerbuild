import { ChevronRight } from "lucide-react"
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
import type { DamageOverTimeView, TickView } from "../lib/combat-view"
import { damageTypeText } from "./damage-type-styles"

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
export function CombatDamageOverTimeLine({ dot }: { dot: DamageOverTimeView }) {
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
