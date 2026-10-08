import type {
	CombatEvent,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
	DealtDamage,
} from "@/lib/combat/combat"
import type { StepView } from "./combat-view"

type HitEvent = Extract<CombatEvent, { kind: "hit" }>

/**
 * The step a hit belongs to (by item index): a tick's application, a delayed hit's step, else the
 * step whose events hold it (a cast's later hits are already on its step).
 */
function hitOwner(event: HitEvent, holder: number): number {
	return event.tick?.owner ?? event.delayed?.owner ?? holder
}

/** A hit of the combo at its moment, with its step and the damage dealt once it landed. */
export type TimedHit = {
	time: number
	/** The item index of the step it belongs to. */
	step: number
	source: DamageSource
	/** A damage over time's tick, else a hit. */
	tick: boolean
	/** Absent for a hit the simulator has no number for. */
	damage?: DealtDamage
	/** The damage dealt so far, this hit's included, and the target's health then. */
	dealt: number
	targetHealth: number
}

/** Every hit of the combo in time order, wherever a card shows it, with its step and the target's health after it. */
export function timedHits(
	result: Pick<CombatResult, "steps">,
	target: Pick<CombatTarget, "health">,
): TimedHit[] {
	const hits = result.steps
		.flatMap(({ events }, holder) =>
			events.flatMap((event) =>
				event.kind === "hit" ? [{ event, step: hitOwner(event, holder) }] : [],
			),
		)
		.toSorted((a, b) => a.event.time - b.event.time)
	let dealt = 0
	return hits.map(({ event, step }) => {
		const damage = "damage" in event ? event.damage : undefined
		dealt += damage?.final ?? 0
		return {
			time: event.time,
			step,
			source: event.source,
			tick: !!event.tick,
			...(damage && { damage }),
			dealt,
			targetHealth: Math.max(0, target.health - dealt),
		}
	})
}

/** When a step starts and its hits land. */
export type StepTiming = {
	/** The item index of the step in the combo. */
	index: number
	startsAt: number
	/** Its first and last hits (its ticks only when it has no other hit); none when it dealt none. */
	lands?: { first: number; last: number }
	/** A hit of it lands after the next action started (Counter Strike's strike, 1 s after its cast). */
	late: boolean
}

function landing(times: readonly number[]): StepTiming["lands"] {
	const [first] = times
	const last = times.at(-1)
	return first === undefined || last === undefined ? undefined : { first, last }
}

/** Each step's start and landing, its delayed hits included, in the combo's order. */
export function stepTimings(
	result: Pick<CombatResult, "steps">,
	hits: readonly TimedHit[],
): StepTiming[] {
	const { steps } = result
	return steps.map((step, index) => {
		const own = hits.filter((hit) => hit.step === index)
		const struck = own.filter((hit) => !hit.tick)
		const lands = landing(
			(struck.length ? struck : own).map(({ time }) => time),
		)
		const next = steps.find(
			({ action }, later) => later > index && action.kind !== "situation",
		)
		return {
			index,
			startsAt: step.time,
			...(lands && { lands }),
			late: !!lands && !!next && lands.last > next.time,
		}
	})
}

/** The rows' order: by when each step's hits land, or as the combo runs. */
export type CombatRowOrder = "hit" | "step"

/** A step as a row of the expanded combo, with the running total of the rows down to it. */
export type CombatRow = StepTiming & {
	/** The step with its own hits: its delayed ones moved to it, other steps' left out; its health is the row's. */
	step: CombatStep
	/** Its damage: its hits' and its ticks'. */
	damage: number
	/** The damage of the rows up to this one, in the order shown, and the target's health after it. */
	dealt: number
	targetHealth: number
}

/** The step's events with its own hits only: the delayed ones of other steps out, its own in, by time. */
function ownEvents(steps: readonly CombatStep[], index: number): CombatEvent[] {
	const kept = (steps[index]?.events ?? []).filter(
		(event) =>
			event.kind !== "hit" || (event.delayed?.owner ?? index) === index,
	)
	const moved = steps.flatMap(({ events }, holder) =>
		holder === index
			? []
			: events.filter(
					(event) => event.kind === "hit" && event.delayed?.owner === index,
				),
	)
	return [...kept, ...moved].toSorted((a, b) => a.time - b.time)
}

type CombatRowsOptions = {
	target: Pick<CombatTarget, "health">
	order: CombatRowOrder
}

/**
 * The combo's steps as rows (markers included): in hit order by their first landing (a step that
 * deals nothing at its start), ties in the combo's order; or in the combo's order. Each row counts
 * its own hits, delayed ones included, and the running total goes down the rows as shown.
 */
export function combatRows(
	result: Pick<CombatResult, "steps">,
	{ target, order }: CombatRowsOptions,
): CombatRow[] {
	const hits = timedHits(result, target)
	const timings = stepTimings(result, hits)
	const sorted =
		order === "step"
			? timings
			: timings.toSorted(
					(a, b) =>
						(a.lands?.first ?? a.startsAt) - (b.lands?.first ?? b.startsAt) ||
						a.index - b.index,
				)
	let dealt = 0
	return sorted.map((timing) => {
		const damage = hits
			.filter((hit) => hit.step === timing.index)
			.reduce((sum, hit) => sum + (hit.damage?.final ?? 0), 0)
		dealt += damage
		const targetHealth = Math.max(0, target.health - dealt)
		const step = result.steps[timing.index]
		if (!step) throw new Error("A timing always has its step")
		return {
			...timing,
			step: {
				...step,
				events: ownEvents(result.steps, timing.index),
				targetHealth,
			},
			damage,
			dealt,
			targetHealth,
		}
	})
}

/** A step's damage by part, after mitigation, when it has several: Empower's attack and its bonus (60 + 131). */
export function damageParts({
	hits,
	damageOverTime,
}: Pick<StepView, "hits" | "damageOverTime">): number[] {
	const parts = [
		...hits.flatMap((hit) => ("final" in hit ? [hit.final] : [])),
		...damageOverTime.flatMap(({ type, final }) => (type ? [final] : [])),
	]
	return parts.length > 1 ? parts : []
}
