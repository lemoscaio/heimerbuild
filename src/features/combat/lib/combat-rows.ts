import type {
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
	DealtDamage,
} from "@/lib/combat/combat"
import type { ProcView, StepView } from "./combat-view"
import {
	type EffectsById,
	groupProcs,
	type Proc,
	placedSteps,
	placeHit,
	sameMoment,
} from "./hit-placement"

/** A hit of the combo at its moment, with its step and the damage dealt once it landed. */
export type TimedHit = {
	time: number
	/** The item index of the step it belongs to (`placeHit`). */
	step: number
	/** The separate damage instance it is part of, by effect id (`placeHit`); none for the step's own hit. */
	instance?: string
	source: DamageSource
	/** A damage over time's tick, else a hit. */
	tick: boolean
	/** An earlier step's effect dealt it once its delay or state was over (Counter Strike's strike). */
	delayed: boolean
	/** Absent for a hit the simulator has no number for, which says why. */
	damage?: DealtDamage
	notModeled?: readonly string[]
	/** The damage dealt so far, this hit's included, and the target's health then. */
	dealt: number
	targetHealth: number
}

type TimedHitsOptions = {
	target: Pick<CombatTarget, "health">
	effects: EffectsById
}

/** Every hit of the combo in time order, placed on its step (`placeHit`), with the target's health after it. */
export function timedHits(
	result: Pick<CombatResult, "steps">,
	{ target, effects }: TimedHitsOptions,
): TimedHit[] {
	const hits = result.steps
		.flatMap(({ events }, holder) =>
			events.flatMap((event) =>
				event.kind === "hit"
					? [{ event, place: placeHit(event, { holder, effects }) }]
					: [],
			),
		)
		.toSorted((a, b) => a.event.time - b.event.time)
	let dealt = 0
	return hits.map(({ event, place }) => {
		const damage = "damage" in event ? event.damage : undefined
		dealt += damage?.final ?? 0
		return {
			time: event.time,
			...place,
			source: event.source,
			tick: !!event.tick,
			delayed: !!event.delayed,
			...("damage" in event
				? { damage: event.damage }
				: { notModeled: event.notModeled }),
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

/** The step's own hits: those of no separate instance (`placeHit`). */
function ownHits(hits: readonly TimedHit[], index: number) {
	return hits.filter((hit) => hit.step === index && !hit.instance)
}

/** When the action after the step starts; none after the last one (markers don't count). */
function nextActionAt(steps: readonly CombatStep[], index: number) {
	return steps.find(
		({ action }, later) => later > index && action.kind !== "situation",
	)?.time
}

/** Each step's start and the landing of its own hits, separate instances left out, in the combo's order. */
export function stepTimings(
	result: Pick<CombatResult, "steps">,
	hits: readonly TimedHit[],
): StepTiming[] {
	const { steps } = result
	return steps.map((step, index) => {
		const own = ownHits(hits, index)
		const struck = own.filter((hit) => !hit.tick)
		const lands = landing(
			(struck.length ? struck : own).map(({ time }) => time),
		)
		const next = nextActionAt(steps, index)
		return {
			index,
			startsAt: step.time,
			...(lands && { lands }),
			late: !!lands && next !== undefined && lands.last > next,
		}
	})
}

/** The rows' order: by when each step's hits land, or as the combo runs. */
export type CombatRowOrder = "hit" | "step"

/** A separate instance's mini row under its step's row: its damage, and the running total down to it. */
export type ProcRow = {
	effectId: string
	time: number
	damage: number
	/** It lands after the next action started (Arcane Comet, 0.8 s after its cast). */
	late: boolean
	dealt: number
	targetHealth: number
}

/** A step as a row of the expanded combo, with the running total of the rows down to it. */
export type CombatRow = StepTiming & {
	/** The step with the hits that belong to it (`placedSteps`), its health the row's. */
	step: CombatStep
	/** Its own damage: its hits' and its ticks', its separate instances left out. */
	damage: number
	/** The damage of the rows up to this one, in the order shown, and the target's health after it. */
	dealt: number
	targetHealth: number
	/** Its separate instances (`groupProcs`), each a mini row under it, in time order. */
	procs: ProcRow[]
}

type CombatRowsOptions = {
	target: Pick<CombatTarget, "health">
	effects: EffectsById
	order: CombatRowOrder
}

function damageOf(hits: readonly TimedHit[]) {
	return hits.reduce((sum, hit) => sum + (hit.damage?.final ?? 0), 0)
}

/** The step's separate instances (`groupProcs`) by time, with their own hits. */
export function stepProcs(
	hits: readonly TimedHit[],
	index: number,
): Proc<TimedHit>[] {
	return groupProcs(
		hits.flatMap(({ instance, ...hit }) =>
			instance && hit.step === index ? [{ ...hit, instance }] : [],
		),
	)
}

/**
 * The combo's steps as rows (markers included): in hit order by their first own landing (a step that
 * deals nothing at its start), ties in the combo's order; or in the combo's order. Each row counts its
 * own hits; its separate instances follow it as mini rows, and the running total goes down them all.
 */
export function combatRows(
	result: Pick<CombatResult, "steps">,
	{ target, effects, order }: CombatRowsOptions,
): CombatRow[] {
	const hits = timedHits(result, { target, effects })
	const timings = stepTimings(result, hits)
	const steps = placedSteps(result.steps, effects)
	const sorted =
		order === "step"
			? timings
			: timings.toSorted(
					(a, b) =>
						(a.lands?.first ?? a.startsAt) - (b.lands?.first ?? b.startsAt) ||
						a.index - b.index,
				)
	let dealt = 0
	const healthAfter = () => Math.max(0, target.health - dealt)
	return sorted.map((timing) => {
		const step = steps[timing.index]
		if (!step) throw new Error("A timing always has its step")
		const damage = damageOf(ownHits(hits, timing.index))
		dealt += damage
		const rowDealt = dealt
		const targetHealth = healthAfter()
		const next = nextActionAt(result.steps, timing.index)
		const procs = stepProcs(hits, timing.index).map(
			({ effectId, time, hits: own }): ProcRow => {
				const procDamage = damageOf(own)
				dealt += procDamage
				return {
					effectId,
					time,
					damage: procDamage,
					late: next !== undefined && time > next,
					dealt,
					targetHealth: healthAfter(),
				}
			},
		)
		return {
			...timing,
			step: { ...step, targetHealth },
			damage,
			dealt: rowDealt,
			targetHealth,
			procs,
		}
	})
}

/** A step's own damage by part, after mitigation, when it has several: Empower's attack and its bonus (60 + 131). */
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

/** A step's separate instances as its view shows them, each with its mini row's timing and running total. */
export function procRows(
	{ procs }: Pick<StepView, "procs">,
	row: Pick<CombatRow, "procs">,
): { view: ProcView; row?: ProcRow }[] {
	return procs.map((view) => {
		const timing = row.procs.find(
			({ effectId, time }) =>
				effectId === view.effectId && sameMoment(time, view.time),
		)
		return timing ? { view, row: timing } : { view }
	})
}
