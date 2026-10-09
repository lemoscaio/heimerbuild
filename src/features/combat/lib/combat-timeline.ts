import type { DamageType } from "@schemas/champion"
import type {
	CombatEvent,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
} from "@/lib/combat/combat"
import type { BuildEffect } from "@/lib/effects/effect"
import { stepProcs, stepTimings, type TimedHit, timedHits } from "./combat-rows"
import type { CombatNames } from "./combat-view"
import { type EffectsById, effectsById, sameMoment } from "./hit-placement"

/** A moment a step's hits land at, colored by the type of most of its damage then. */
export type TimelineDot = { time: number; type?: DamageType }

/** A part of a card's damage: its hits of one source and type, or one damage over time's ticks. */
export type TimelinePart = { type: DamageType; final: number }

/** An effect's hits that are part of a step's own (Grandmaster-at-Arms' third hit +52, Wit's End's +45), added up. */
export type TimelineBonus = {
	effectId: string
	label: string
	icon?: string
	type: DamageType
	final: number
}

type TimelineDamage = {
	/** After mitigation. */
	damage: number
	/** Its parts when it has several (60 + 131), else none. */
	parts: TimelinePart[]
	mainType?: DamageType
}

/** A step at its start: its windup to its first landing, its own hits, and its first separate instance's moment. */
export type TimelineStep = TimelineDamage & {
	kind: "step"
	/** The item index in the combo. */
	index: number
	startsAt: number
	/** Its place among the steps that start at the same moment, which stack. */
	column: number
	/** The moments its own hits land, separate instances left out. */
	dots: TimelineDot[]
	lands?: { first: number; last: number }
	bonuses: TimelineBonus[]
	/** When its first separate instance lands, and what it does there ("strikes"). */
	firstProc?: { at: number; verb: string }
	/** A hit of it lands after the next step started. */
	late: boolean
	/** The target's health after its last own hit (its first tick when it only ticks), when it has one. */
	targetHealth?: number
	refused?: string
	/** A wait's length. */
	wait?: number
}

/**
 * A separate damage instance's own card at its landing, joined to the step that triggered it (issue
 * 429: Counter Strike's strike at 1.00 s, Arcane Comet, Guinsoo's Phantom Hit).
 */
export type TimelineProc = TimelineDamage & {
	kind: "proc"
	/** Its step's item index. */
	index: number
	/** Its step's start and column, which its track goes down from. */
	startsAt: number
	column: number
	time: number
	effectId: string
	/** Its effect's short name: its label ("Phantom Hit"), else its name. */
	name: string
	icon?: string
	verb: string
	targetHealth: number
}

export type TimelineMarker = { kind: "marker"; index: number; time: number }

export type TimelineEntry = TimelineStep | TimelineProc | TimelineMarker

/** An effect or a mark as a lane: when it runs, and a notch at each step that triggered or refreshed it. */
export type TimelineLane = {
	key: string
	name: string
	spans: { from: number; to: number }[]
	notches: number[]
}

export type CombatTimeline = {
	/** Steps, separate instances and markers by when they happen; ties in the combo's order, steps first. */
	entries: TimelineEntry[]
	/** How many steps start at the same moment at most. */
	columns: number
	lanes: TimelineLane[]
	/** The combo's time: its last damage. */
	lastHit: number
	/** When the last effect or mark ran out. */
	effectsUntil: number
}

type CombatTimelineOptions = {
	target: Pick<CombatTarget, "health">
	names: CombatNames
	effects: readonly BuildEffect[]
}

/** The damage of some hits, its parts by source and type, and the type of most of it. */
function damageOf(
	hits: readonly TimedHit[],
	names: CombatNames,
): TimelineDamage {
	const parts = new Map<string, TimelinePart>()
	const byType = new Map<DamageType, number>()
	let damage = 0
	for (const { source, tick, damage: dealt } of hits) {
		if (!dealt) continue
		damage += dealt.final
		byType.set(dealt.type, (byType.get(dealt.type) ?? 0) + dealt.final)
		const key = `${tick ? "tick" : "hit"}:${names.source(source)}:${dealt.type}`
		const part = parts.get(key) ?? { type: dealt.type, final: 0 }
		part.final += dealt.final
		parts.set(key, part)
	}
	const mainType = [...byType].toSorted((a, b) => b[1] - a[1])[0]?.[0]
	return {
		damage,
		parts: parts.size > 1 ? [...parts.values()] : [],
		...(mainType && { mainType }),
	}
}

/** Its hits grouped by the moment they land, each colored by its main type. */
function dotsOf(hits: readonly TimedHit[]): TimelineDot[] {
	const dots: { time: number; hits: TimedHit[] }[] = []
	for (const hit of hits) {
		const last = dots.at(-1)
		if (last && sameMoment(last.time, hit.time)) last.hits.push(hit)
		else dots.push({ time: hit.time, hits: [hit] })
	}
	return dots.map(({ time, hits: moment }) => {
		const totals = new Map<DamageType, number>()
		for (const { damage } of moment) {
			if (damage)
				totals.set(damage.type, (totals.get(damage.type) ?? 0) + damage.final)
		}
		const type = [...totals].toSorted((a, b) => b[1] - a[1])[0]?.[0]
		return { time, ...(type && { type }) }
	})
}

function effectOf(source: DamageSource, effects: EffectsById) {
	return source.kind === "effect" ? effects.get(source.effectId) : undefined
}

/** What a separate instance does when it lands: its effect's delay label ("strikes"), else "lands". */
function procVerb(effectId: string, effects: EffectsById) {
	return effects.get(effectId)?.effect.delay?.label ?? "lands"
}

/** An effect by its short name: its label ("third hit", "Phantom Hit"), else its name. */
function shortName(
	effectId: string,
	{ names, effects }: { names: CombatNames; effects: EffectsById },
) {
	const effect = effects.get(effectId)
	return effect?.effect.label ?? effect?.name ?? names.effect(effectId)
}

/** The effects' hits among a step's own, each effect's added up, by short name ("third hit +52"). */
function bonusesOf(
	hits: readonly TimedHit[],
	{ names, effects }: { names: CombatNames; effects: EffectsById },
): TimelineBonus[] {
	const bonuses = new Map<string, TimelineBonus>()
	for (const { source, damage } of hits) {
		if (source.kind !== "effect" || !damage) continue
		const { effectId } = source
		const bonus = bonuses.get(effectId)
		if (bonus) {
			bonus.final += damage.final
			continue
		}
		const icon = names.icon(effectId)
		bonuses.set(effectId, {
			effectId,
			label: effectOf(source, effects)?.effect.label ?? names.source(source),
			...(icon && { icon }),
			type: damage.type,
			final: damage.final,
		})
	}
	return [...bonuses.values()]
}

/** Each step's place among the steps that start at its moment (markers have none). */
function startColumns(steps: readonly CombatStep[]): number[] {
	const columns: number[] = []
	let start: number | undefined
	let column = 0
	for (const step of steps) {
		if (step.action.kind === "situation") {
			columns.push(0)
			continue
		}
		column =
			start !== undefined && sameMoment(start, step.time) ? column + 1 : 0
		start = step.time
		columns.push(column)
	}
	return columns
}

type Span = { from: number; to: number }

/** The events of the whole combo in time order. */
function allEvents(steps: readonly CombatStep[]): CombatEvent[] {
	return steps
		.flatMap(({ events }) => events)
		.toSorted((a, b) => a.time - b.time)
}

/** When a step took effect: its first own landing, else its start. */
function stepMoment(index: number, timings: ReturnType<typeof stepTimings>) {
	const timing = timings[index]
	return timing?.lands?.first ?? timing?.startsAt ?? 0
}

type EffectLane = {
	effectId: string
	holder: string
	name: string
	starts: Set<number>
	notches: number[]
}

/**
 * The effects that ran out during the combo, each as a lane: from each start the steps report to
 * its `expire` event; one that starts after the last step (Blaze's detonation) from its state's end
 * or its first hit. A notch where a step triggered, refreshed or stacked it.
 */
function effectLanes(
	result: Pick<CombatResult, "steps">,
	{
		names,
		timings,
		events,
	}: {
		names: CombatNames
		timings: ReturnType<typeof stepTimings>
		events: readonly CombatEvent[]
	},
): TimelineLane[] {
	const lanes = new Map<string, EffectLane>()
	const laneOf = (effectId: string, holder: string) => {
		const key = `${holder}:${effectId}`
		const lane = lanes.get(key) ?? {
			effectId,
			holder,
			name:
				holder === "target"
					? `${names.effect(effectId)} on the target`
					: names.effect(effectId),
			starts: new Set<number>(),
			notches: [],
		}
		lanes.set(key, lane)
		return lane
	}
	const states = new Map<EffectLane, string>()
	result.steps.forEach((step, index) => {
		for (const { effectId, holder, startedAt, endsAt, stacks } of step.active) {
			const lane = laneOf(effectId, holder)
			lane.starts.add(startedAt)
			const state = `${startedAt}@${endsAt}@${stacks}`
			if (states.get(lane) !== state)
				lane.notches.push(stepMoment(index, timings))
			states.set(lane, state)
		}
	})
	const expiries = events.flatMap((event) =>
		event.kind === "expire" && "effectId" in event ? [event] : [],
	)
	for (const { effectId, holder, time } of expiries) {
		const lane = laneOf(effectId, holder)
		if ([...lane.starts].some((start) => start <= time)) continue
		const waited = result.steps
			.flatMap(({ waiting }) => waiting ?? [])
			.findLast((entry) => entry.effectId === effectId && entry.until <= time)
		const hit = events.find(
			(event) =>
				event.kind === "hit" &&
				event.source.kind === "effect" &&
				event.source.effectId === effectId,
		)
		const start = waited?.until ?? hit?.time
		if (start === undefined) continue
		lane.starts.add(start)
		lane.notches.push(start)
	}
	return [...lanes].flatMap(([key, lane]) => {
		const ends = expiries
			.filter(
				({ effectId, holder }) =>
					effectId === lane.effectId && holder === lane.holder,
			)
			.map(({ time }) => time)
		const spans = spansTo([...lane.starts], ends)
		return spans.length
			? [{ key, name: lane.name, spans, notches: lane.notches }]
			: []
	})
}

/** From each start to the first end at or after it, those that overlap as one; none without an end. */
function spansTo(starts: readonly number[], ends: readonly number[]): Span[] {
	const spans = starts
		.toSorted((a, b) => a - b)
		.flatMap((from): Span[] => {
			const to = ends.find((end) => end >= from)
			return to === undefined ? [] : [{ from, to }]
		})
	return merged(spans)
}

/** Spans that overlap as one. */
function merged(spans: readonly Span[]): Span[] {
	const out: Span[] = []
	for (const span of spans) {
		const last = out.at(-1)
		if (last && span.from <= last.to) last.to = Math.max(last.to, span.to)
		else out.push({ ...span })
	}
	return out
}

/** The marks put on the target, each as a lane from when it was put on to when it left. */
function markLanes(
	result: Pick<CombatResult, "steps">,
	{ names, events }: { names: CombatNames; events: readonly CombatEvent[] },
): TimelineLane[] {
	const starts = new Map<string, number[]>()
	const add = (mark: string, time: number) =>
		starts.set(mark, [...(starts.get(mark) ?? []), time])
	for (const event of events) {
		if (event.kind === "mark-applied") add(event.mark, event.time)
	}
	// A marker puts a mark on with no event: the first step that holds it.
	for (const step of result.steps) {
		for (const { mark } of step.marks) {
			if (!starts.has(mark)) add(mark, step.time)
		}
	}
	return [...starts].map(([mark, times]) => {
		const ends = events.flatMap((event) =>
			(event.kind === "mark-consumed" ||
				(event.kind === "expire" && "mark" in event)) &&
			event.mark === mark
				? [event.time]
				: [],
		)
		return {
			key: `mark:${mark}`,
			name: `${names.mark(mark)} mark`,
			spans: spansTo(times, ends),
			notches: times,
		}
	})
}

/**
 * The combo as a vertical timeline (issue 402), from the rows' view model: each step at its start
 * with its windup and own hits, each separate instance at its landing (`placeHit`), markers, and the
 * effects and marks running as lanes. Damage and health are those of the hits (`timedHits`), so they
 * add up to the totals.
 */
export function combatTimeline(
	result: Pick<CombatResult, "steps" | "duration" | "activeUntil">,
	{ target, names, effects: buildEffects }: CombatTimelineOptions,
): CombatTimeline {
	const effects = effectsById(buildEffects)
	const hits = timedHits(result, { target, effects })
	const timings = stepTimings(result, hits)
	const columns = startColumns(result.steps)
	const events = allEvents(result.steps)
	// The health once every hit of a moment landed: a step and a proc landing together show the same.
	const healthAt = (time: number) =>
		hits.findLast((hit) => sameMoment(hit.time, time))?.targetHealth ??
		target.health

	const entries = result.steps.flatMap((step, index): TimelineEntry[] => {
		if (step.action.kind === "situation") {
			return [{ kind: "marker", index, time: step.time }]
		}
		const column = columns[index] ?? 0
		const onRow = hits.filter((hit) => hit.step === index && !hit.instance)
		const struck = onRow.filter((hit) => !hit.tick)
		const procs = stepProcs(hits, index)
		const [firstProc] = procs
		const [first] = struck
		const last = struck.at(-1)
		// Its ticks may land long after it (Blaze on E), so the health is the one after its last hit.
		const healthAfter = struck.findLast((hit) => !!hit.damage) ?? onRow[0]
		const card: TimelineStep = {
			kind: "step",
			index,
			startsAt: step.time,
			column,
			dots: dotsOf(struck),
			...(first && last && { lands: { first: first.time, last: last.time } }),
			...damageOf(onRow, names),
			bonuses: bonusesOf(struck, { names, effects }),
			...(firstProc && {
				firstProc: {
					at: firstProc.time,
					verb: procVerb(firstProc.effectId, effects),
				},
			}),
			late: timings[index]?.late ?? false,
			...(healthAfter && { targetHealth: healthAt(healthAfter.time) }),
			...(step.refused && { refused: step.refused }),
			...(step.action.kind === "wait" && { wait: step.action.seconds }),
		}
		const procCards = procs.map(
			({ effectId, time, hits: landed }): TimelineProc => {
				const icon = names.icon(effectId)
				return {
					kind: "proc",
					index,
					startsAt: step.time,
					column,
					time,
					effectId,
					name: shortName(effectId, { names, effects }),
					...(icon && { icon }),
					verb: procVerb(effectId, effects),
					...damageOf(landed, names),
					targetHealth: healthAt(time),
				}
			},
		)
		return [card, ...procCards]
	})

	const at = (entry: TimelineEntry) =>
		entry.kind === "step" ? entry.startsAt : entry.time
	return {
		entries: entries.toSorted(
			(a, b) =>
				at(a) - at(b) ||
				Number(a.kind === "proc") - Number(b.kind === "proc") ||
				a.index - b.index,
		),
		columns: Math.max(1, ...columns.map((column) => column + 1)),
		lanes: [
			...effectLanes(result, { names, timings, events }),
			...markLanes(result, { names, events }),
		].toSorted((a, b) => (a.spans[0]?.from ?? 0) - (b.spans[0]?.from ?? 0)),
		lastHit: result.duration,
		effectsUntil: result.activeUntil,
	}
}
