import type { DamageType } from "@schemas/champion"
import { cva } from "class-variance-authority"
import { Fragment, useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { CombatAction } from "@/lib/combat/combat"
import type { CombatListItem } from "../hooks/use-combat-view"
import {
	type ActionNames,
	type ActionSources,
	actionIcon,
	actionNames,
} from "../lib/combat-action-names"
import {
	actionLabel,
	DAMAGE_TYPE_NAMES,
	formatDamage,
	formatSeconds,
	formatSecondsRange,
} from "../lib/combat-format"
import type {
	CombatTimeline as CombatTimelineModel,
	TimelineBonus,
	TimelineEntry,
	TimelineLane,
	TimelinePart,
	TimelineProc,
	TimelineStep,
} from "../lib/combat-timeline"
import {
	columnX,
	TIMELINE_GEOMETRY,
	type TimelineCardLayout,
	type TimelineLayout,
	timelineLayout,
	timelineY,
} from "../lib/combat-timeline-layout"
import { sameMoment } from "../lib/hit-placement"
import { CombatActionIcon } from "./combat-action-icon"
import { damageTypeFill, damageTypeText } from "./damage-type-styles"

const card = cva(
	"absolute flex h-6.5 items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-md border px-2 text-[0.6875rem] text-prose",
	{
		variants: {
			tone: {
				step: "border-line bg-surface",
				late: "border-lilac bg-lilac/15",
				proc: "border-lilac border-dashed",
				marker: "border-line border-dashed text-subtle",
			},
			dimmed: { true: "opacity-50", false: "" },
		},
	},
)

const laneTone = cva("", {
	variants: {
		tone: {
			0: "bg-lilac",
			1: "bg-sorcery",
			2: "bg-inspiration",
			3: "bg-precision",
		},
	},
})

const LANE_TONES = 4

function laneColor(index: number) {
	const tone = (index % LANE_TONES) as 0 | 1 | 2 | 3
	return laneTone({ tone })
}

/** An item of the list at an entry's index: a step's number and action, or a marker's line. */
type Items = readonly CombatListItem[]

function stepItem(items: Items, index: number) {
	const item = items[index]
	return item?.kind === "step" ? item : undefined
}

/** A step's key ("E", "Attack", "Flash") and its ability's name, which narrow timelines leave out. */
function stepTitle(action: CombatAction, names: ActionNames) {
	return action.kind === "ability"
		? { key: action.slot, name: names.ability(action.slot) }
		: { key: actionLabel(action, names) }
}

/** An entry's identity: a step's or marker's index; a proc's effect and moment too, as several can follow one step. */
function entryKey(entry: TimelineEntry) {
	const own = entry.kind === "proc" ? `-${entry.effectId}@${entry.time}` : ""
	return `${entry.kind}-${entry.index}${own}`
}

/** "instant", "lands 0.27 s", "lands 0.75–1.35 s" */
function landsText({ startsAt, lands }: TimelineStep) {
	if (!lands) return undefined
	if (sameMoment(lands.first, lands.last)) {
		return sameMoment(lands.first, startsAt)
			? "instant"
			: `lands ${formatSeconds(lands.first)}`
	}
	return `lands ${formatSecondsRange(lands.first, lands.last)}`
}

function DamageParts({ parts }: { parts: readonly TimelinePart[] }) {
	return (
		<>
			(
			{parts.map(({ type, final }, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: a card's parts never reorder
				<Fragment key={index}>
					{index > 0 && " + "}
					<span className={damageTypeText(type)}>{formatDamage(final)}</span>
				</Fragment>
			))}
			)
		</>
	)
}

function Damage({ damage, type }: { damage: number; type?: DamageType }) {
	return (
		<b
			className={cn(
				"font-bold font-display text-[0.8125rem] text-white tabular-nums",
				type && damageTypeText(type),
			)}
		>
			{formatDamage(damage)}
		</b>
	)
}

/** A step card's right side: its damage and landing, where its first separate instance lands, or its wait. */
function StepResult({ entry }: { entry: TimelineStep }) {
	if (entry.refused) return <span className="text-error">refused</span>
	if (entry.wait !== undefined) {
		return <span className="text-subtle">{formatSeconds(entry.wait)}</span>
	}
	if (entry.damage > 0) {
		return (
			<span className="flex items-baseline gap-1">
				<Damage damage={entry.damage} type={entry.mainType} />
				{!!entry.parts.length && (
					<span className="@lg:inline hidden text-subtle tabular-nums">
						<DamageParts parts={entry.parts} />
					</span>
				)}
				<span className="@md:inline hidden text-subtle tabular-nums">
					· {landsText(entry)}
				</span>
			</span>
		)
	}
	if (entry.firstProc) {
		return (
			<span className="text-subtle tabular-nums">
				<span className="@md:inline hidden">{entry.firstProc.verb} </span>
				{formatSeconds(entry.firstProc.at)} ↓
			</span>
		)
	}
	return null
}

type CardProps = {
	layout: TimelineCardLayout
	items: Items
	names: ActionNames
	sources: ActionSources
}

function StepCard({
	entry,
	layout,
	items,
	names,
	sources,
}: CardProps & { entry: TimelineStep }) {
	const item = stepItem(items, entry.index)
	if (!item) return null
	const title = stepTitle(item.action, names)
	return (
		<div
			className={card({
				tone: entry.late ? "late" : "step",
				dimmed: !!entry.refused,
			})}
			style={cardPosition(layout)}
		>
			<span className="flex min-w-0 items-center gap-1.5">
				<CombatActionIcon
					kind={item.action.kind}
					icon={actionIcon(item.action, sources)}
					className="size-4.5 rounded-sm text-[0.5rem]"
				/>
				<b className="truncate font-semibold text-white">
					{item.number}. {title.key}
					{title.name && (
						<span className="@lg:inline hidden"> · {title.name}</span>
					)}
				</b>
				<span className="@md:inline hidden text-subtle tabular-nums">
					{formatSeconds(entry.startsAt)}
				</span>
			</span>
			<StepResult entry={entry} />
		</div>
	)
}

/** A separate instance's card at its landing: "↳ 7. [icon] Phantom Hit phantom hit · 82 · 3.30 s". */
function ProcCard({
	entry,
	layout,
	items,
}: Omit<CardProps, "names" | "sources"> & { entry: TimelineProc }) {
	const number = stepItem(items, entry.index)?.number
	return (
		<div className={card({ tone: "proc" })} style={cardPosition(layout)}>
			<span className="flex min-w-0 items-center gap-1.5">
				<span className="text-subtle">↳</span>
				<GameIcon
					name={entry.name}
					src={entry.icon}
					className="size-4 rounded-sm"
				/>
				<b className="truncate font-semibold text-white">
					{number}. {entry.name}
				</b>
				<span className="@md:inline hidden text-subtle">{entry.verb}</span>
			</span>
			<span className="flex items-baseline gap-1">
				<Damage damage={entry.damage} type={entry.mainType} />
				<span className="@md:inline hidden text-subtle tabular-nums">
					· {formatSeconds(entry.time)}
				</span>
			</span>
		</div>
	)
}

function MarkerCard({
	index,
	layout,
	items,
}: Omit<CardProps, "names" | "sources"> & { index: number }) {
	const item = items[index]
	if (item?.kind !== "marker") return null
	const { label, detail, tone } = item.view
	return (
		<div
			className={card({
				tone: "marker",
				dimmed: tone === "ignored" || tone === "no-effect",
			})}
			style={cardPosition(layout)}
		>
			<span className="truncate">
				<b className="font-semibold text-prose">{label}</b> · {detail}
			</span>
		</div>
	)
}

function cardPosition({ top }: TimelineCardLayout): React.CSSProperties {
	return {
		top,
		left: "var(--cards-left)",
		right: "calc(var(--aside) + var(--lanes) + 12px)",
	}
}

/** A step's marks on its start column: its start, its windup down to its first hit, its hits. */
function StartMarks({ entry }: { entry: TimelineStep }) {
	const x = columnX(entry.column)
	const start = timelineY(entry.startsAt)
	const firstHit = entry.lands?.first
	const busyUntil =
		entry.wait !== undefined ? entry.startsAt + entry.wait : firstHit
	return (
		<>
			{busyUntil !== undefined && busyUntil > entry.startsAt && (
				<span
					className={cn("absolute w-1.5 rounded-full", {
						"bg-lilac/50": entry.wait === undefined,
						"border border-line-strong border-dashed": entry.wait !== undefined,
					})}
					style={{
						left: x - 3,
						top: start,
						height: timelineY(busyUntil) - start,
					}}
				/>
			)}
			<span
				className="absolute h-0.5 w-2.5 bg-white"
				style={{ left: x - 5, top: start - 1 }}
			/>
			{entry.dots.map(({ time, type }) => (
				<HitDot key={time} x={x} time={time} type={type} />
			))}
		</>
	)
}

function HitDot({
	x,
	time,
	type,
}: {
	x: number
	time: number
	type?: DamageType
}) {
	return (
		<span
			className={cn(
				"absolute size-2.5 rounded-full",
				type ? damageTypeFill(type) : "bg-subtle",
			)}
			style={{ left: x - 5, top: timelineY(time) - 5 }}
		/>
	)
}

/** The lines from each moment to its card, and each delayed hit's dotted track from its step. */
function Connectors({ layout }: { layout: TimelineLayout }) {
	const { cardHeight, ruler } = TIMELINE_GEOMETRY
	const end = layout.cardsLeft - 2
	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 size-full overflow-visible"
		>
			{layout.cards.map(({ entry, anchor, top }) => {
				const center = top + cardHeight / 2
				const from = entry.kind === "marker" ? ruler : columnX(entry.column) + 6
				return (
					<Fragment key={entryKey(entry)}>
						{entry.kind === "proc" && (
							<line
								x1={columnX(entry.column)}
								x2={columnX(entry.column)}
								y1={timelineY(entry.startsAt)}
								y2={anchor}
								className="stroke-2 stroke-lilac"
								strokeDasharray="2 4"
							/>
						)}
						<polyline
							points={`${from},${anchor} ${end - 8},${center} ${end},${center}`}
							fill="none"
							className="stroke-line-strong"
						/>
					</Fragment>
				)
			})}
		</svg>
	)
}

function Ruler({ ticks }: { ticks: TimelineLayout["ticks"] }) {
	return ticks.map(({ time, y, major }) => (
		<Fragment key={time}>
			<span
				className={cn("absolute left-0 w-8.5 text-right tabular-nums", {
					"text-[0.625rem] text-subtle": major,
					"text-[0.5625rem] text-subtle/70": !major,
				})}
				style={{ top: y - 7 }}
			>
				{time.toFixed(1)} s
			</span>
			<span
				className={cn("absolute right-0 border-t", {
					"border-line/70 border-dashed": major,
					"border-line/40 border-dotted": !major,
				})}
				style={{ left: TIMELINE_GEOMETRY.ruler, top: y }}
			/>
		</Fragment>
	))
}

const referenceLine = cva("absolute right-0 border-t-[1.5px]", {
	variants: {
		tone: {
			lastHit: "border-white/60",
			effects: "border-subtle border-dashed",
		},
	},
})

const referenceLabel = cva(
	"absolute right-(--label-right) whitespace-nowrap text-[0.625rem] tabular-nums",
	{
		variants: {
			tone: { lastHit: "text-white", effects: "text-subtle" },
		},
	},
)

function ReferenceLine({
	time,
	tone,
	children,
}: {
	time: number
	tone: "lastHit" | "effects"
	children: React.ReactNode
}) {
	const y = timelineY(time)
	return (
		<>
			<span
				className={referenceLine({ tone })}
				style={{ left: TIMELINE_GEOMETRY.ruler, top: y }}
			/>
			<span className={referenceLabel({ tone })} style={{ top: y + 3 }}>
				{children}
			</span>
		</>
	)
}

/** The effects and marks as thin lanes at the right, a notch where a step triggered or refreshed each. */
function Lanes({
	lanes,
	width,
}: {
	lanes: readonly TimelineLane[]
	width: number
}) {
	const { lane: laneWidth } = TIMELINE_GEOMETRY
	return (
		<div
			className="absolute inset-y-0"
			style={{ right: "calc(var(--aside) + 6px)", width }}
		>
			{lanes.map(({ key, name, spans, notches }, index) => (
				<Fragment key={key}>
					{spans.map(({ from, to }) => (
						<span
							key={from}
							title={name}
							className={cn(
								"absolute w-2 rounded-full opacity-55",
								laneColor(index),
							)}
							style={{
								left: index * laneWidth + 4,
								top: timelineY(from),
								height: Math.max(2, timelineY(to) - timelineY(from)),
							}}
						/>
					))}
					{notches.map((time, notch) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: two steps can notch a lane at one moment
							key={notch}
							className="absolute h-0.5 w-3 bg-white"
							style={{ left: index * laneWidth + 2, top: timelineY(time) - 1 }}
						/>
					))}
				</Fragment>
			))}
		</div>
	)
}

/**
 * An effect's hits on a step: "[icon] +45". Its label only when it is the step's one bonus ("third
 * hit +52"), so several fit side by side instead of being cut to a letter (issue 429).
 */
function BonusChip({
	bonus,
	children,
}: {
	bonus: TimelineBonus
	/** Its label, when shown. */
	children?: React.ReactNode
}) {
	return (
		<span
			title={`${bonus.label} +${formatDamage(bonus.final)}`}
			className="flex shrink-0 items-center gap-0.5 rounded-sm bg-outcome-fill px-0.5 text-outcome-ink"
		>
			{!!bonus.icon && (
				<GameIcon
					name={bonus.label}
					src={bonus.icon}
					className="size-3 rounded-xs"
				/>
			)}
			{children} +{formatDamage(bonus.final)}
		</span>
	)
}

/**
 * Next to each card, from `@xl` up: the effects' hits on it and the target's health after it. Chips
 * that don't fit on the one line wrap out of sight whole, never cut; the health always shows.
 */
function CardAside({ layout }: { layout: TimelineCardLayout }) {
	const { entry, top } = layout
	if (entry.kind === "marker") return null
	const bonuses = entry.kind === "step" ? entry.bonuses : []
	const { targetHealth } = entry
	if (targetHealth === undefined && !bonuses.length) return null
	return (
		<div
			className="absolute right-0 @xl:flex hidden h-6.5 w-(--aside) items-center gap-1 overflow-hidden whitespace-nowrap pl-2 text-[0.625rem]"
			style={{ top }}
		>
			<span className="flex h-4 min-w-0 flex-wrap items-center gap-1 overflow-hidden">
				{bonuses.map((bonus) => (
					<BonusChip key={bonus.effectId} bonus={bonus}>
						{bonuses.length === 1 && bonus.label}
					</BonusChip>
				))}
			</span>
			{targetHealth !== undefined && (
				<span className="ml-auto shrink-0 text-health tabular-nums">
					{formatDamage(targetHealth)} HP
				</span>
			)}
		</div>
	)
}

function Legend({ lanes }: { lanes: readonly TimelineLane[] }) {
	if (!lanes.length) return null
	return (
		<div
			aria-hidden="true"
			className="@xl:flex hidden flex-wrap justify-end gap-x-3 gap-y-1 px-2 pb-1 text-[0.6875rem] text-subtle"
		>
			{lanes.map(({ key, name }, index) => (
				<span key={key} className="flex items-center gap-1.5">
					<span
						className={cn("size-2 rounded-full opacity-70", laneColor(index))}
					/>
					{name}
				</span>
			))}
		</div>
	)
}

function partsText(parts: readonly TimelinePart[]) {
	return parts
		.map(
			({ type, final }) => `${formatDamage(final)} ${DAMAGE_TYPE_NAMES[type]}`,
		)
		.join(" + ")
}

/** What a screen reader hears for an entry: its time, damage and the target's health after it. */
function entryText(entry: TimelineEntry, items: Items, names: ActionNames) {
	if (entry.kind === "marker") {
		const item = items[entry.index]
		return item?.kind === "marker"
			? `Marker ${item.view.label}: ${item.view.detail}.`
			: ""
	}
	const item = stepItem(items, entry.index)
	if (!item) return ""
	const health =
		entry.targetHealth !== undefined &&
		`target health ${formatDamage(entry.targetHealth)}`
	const damage = (parts: readonly TimelinePart[], total: number) =>
		`${formatDamage(total)} damage${parts.length ? ` (${partsText(parts)})` : ""}`
	if (entry.kind === "proc") {
		return `${item.number}. ${entry.name} ${entry.verb} at ${formatSeconds(entry.time)}: ${[damage(entry.parts, entry.damage), health].filter(Boolean).join(", ")}.`
	}
	const parts = [
		`starts ${formatSeconds(entry.startsAt)}`,
		entry.refused && `refused: ${entry.refused}`,
		entry.wait !== undefined && `waits ${formatSeconds(entry.wait)}`,
		entry.damage > 0 && landsText(entry),
		entry.damage > 0 && damage(entry.parts, entry.damage),
		...entry.bonuses.map(
			({ label, final }) => `${label} +${formatDamage(final)}`,
		),
		entry.damage > 0 && health,
		entry.firstProc &&
			`${entry.firstProc.verb} at ${formatSeconds(entry.firstProc.at)}`,
	]
	return `${item.number}. ${actionLabel(item.action, names)}: ${parts.filter(Boolean).join(", ")}.`
}

/** The timeline as text: every entry in time order, the effects' spans and the reference times. */
function TimelineText({
	timeline,
	items,
	names,
}: {
	timeline: CombatTimelineModel
	items: Items
	names: ActionNames
}) {
	const { entries, lanes, lastHit, effectsUntil } = timeline
	return (
		<div className="sr-only">
			<ol>
				{entries.map((entry) => (
					<li key={entryKey(entry)}>{entryText(entry, items, names)}</li>
				))}
			</ol>
			{!!lanes.length && (
				<p>
					Effects:{" "}
					{lanes
						.map(
							({ name, spans }) =>
								`${name} ${spans.map(({ from, to }) => formatSecondsRange(from, to)).join(" and ")}`,
						)
						.join("; ")}
					.
				</p>
			)}
			<p>
				Last hit at {formatSeconds(lastHit)}
				{effectsUntil > lastHit &&
					`; effects until ${formatSeconds(effectsUntil)}`}
				.
			</p>
		</div>
	)
}

type CombatTimelineProps = {
	timeline: CombatTimelineModel
	/** The combo's entries as the list shows them, by item index: steps' numbers and actions, markers' lines. */
	items: Items
	sources: ActionSources
} & React.ComponentProps<"figure">

/**
 * The combo as a vertical timeline (issue 402): time flows down a ruler; each step sits at its
 * start with its windup and hits, a separate instance at its landing, the effects as lanes at the right.
 * One component for every screen: narrower, it drops the legend, the health and the details.
 */
export function CombatTimeline({
	timeline,
	items,
	sources,
	className,
	...props
}: CombatTimelineProps) {
	const captionId = useId()
	const names = actionNames(sources)
	const layout = timelineLayout(timeline)
	const { lastHit, effectsUntil } = timeline

	return (
		<figure
			aria-labelledby={captionId}
			className={cn("@container flex flex-col", className)}
			{...props}
		>
			<figcaption id={captionId} className="sr-only">
				Combo timeline, time flowing down
			</figcaption>
			<Legend lanes={timeline.lanes} />
			<div
				aria-hidden="true"
				className="relative min-w-72 @2xl:[--aside:11rem] @xl:[--aside:8rem] @xl:[--label-right:4px] [--aside:0px] [--label-right:calc(var(--lanes)+12px)]"
				style={
					{
						height: layout.height,
						"--lanes": `${layout.lanesWidth}px`,
						"--cards-left": `${layout.cardsLeft}px`,
					} as React.CSSProperties
				}
			>
				<Ruler ticks={layout.ticks} />
				<Connectors layout={layout} />
				{lastHit > 0 && (
					<ReferenceLine time={lastHit} tone="lastHit">
						<span className="@md:inline hidden">Time </span>
						{formatSeconds(lastHit)} · last hit
					</ReferenceLine>
				)}
				{effectsUntil > lastHit && (
					<ReferenceLine time={effectsUntil} tone="effects">
						effects until {formatSeconds(effectsUntil)}
					</ReferenceLine>
				)}
				<Lanes lanes={timeline.lanes} width={layout.lanesWidth} />
				{layout.cards.map((cardLayout) => {
					const { entry } = cardLayout
					const key = entryKey(entry)
					return (
						<Fragment key={key}>
							{entry.kind === "step" && (
								<>
									<StartMarks entry={entry} />
									<StepCard
										entry={entry}
										layout={cardLayout}
										items={items}
										names={names}
										sources={sources}
									/>
								</>
							)}
							{entry.kind === "proc" && (
								<>
									<HitDot
										x={columnX(entry.column)}
										time={entry.time}
										type={entry.mainType}
									/>
									<ProcCard entry={entry} layout={cardLayout} items={items} />
								</>
							)}
							{entry.kind === "marker" && (
								<MarkerCard
									index={entry.index}
									layout={cardLayout}
									items={items}
								/>
							)}
							<CardAside layout={cardLayout} />
						</Fragment>
					)
				})}
			</div>
			<TimelineText timeline={timeline} items={items} names={names} />
		</figure>
	)
}
