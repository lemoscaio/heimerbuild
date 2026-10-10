import type { DamageType } from "@schemas/champion"
import type { CombatItem } from "@/lib/combat/combat"
import {
	type DamageOverTimeView,
	type DamageTypeShare,
	type OutcomeView,
	type ResistChangeView,
	type StepView,
	typeShares,
} from "./combat-view"

/** Identical steps in a row group from this many on (issue 331, option A). */
export const MIN_GROUP_SIZE = 3

/**
 * What makes two steps identical: the same action with the same inputs (a wait's length, an
 * ability's variant and time in the area). A marker never is, so it always splits a group.
 */
export function actionKey(action: CombatItem): string | undefined {
	switch (action.kind) {
		case "situation":
			return undefined
		case "attack":
			return "attack"
		case "ability":
			return `ability:${action.slot}:${action.variant ?? ""}:${action.inArea ?? ""}`
		case "summoner":
			return `summoner:${action.slot}`
		case "wait":
			return `wait:${action.seconds}`
	}
}

/** An item of the list as it shows: one entry, or a run of identical steps. */
export type CombatRun<T> =
	| { kind: "single"; item: T }
	| { kind: "group"; items: T[] }

type GroupRunsOptions<T> = {
	/** What makes two steps identical; none for an entry that is never grouped and splits a run (a marker). */
	key: (item: T) => string | undefined
	/** A step's place in the combo: a run's steps also follow one another there, so it moves as one block. */
	indexOf?: (item: T) => number | undefined
	/** A proc's step, by its place in the combo: a proc of the run's steps stays inside the run. */
	ownerOf?: (item: T) => number | undefined
}

/**
 * The items as shown, each run of `MIN_GROUP_SIZE` or more identical steps in a row as one group,
 * with the procs of its steps that land among them; anything else splits it. The same rule in
 * either order of the rows (issue 405).
 */
export function groupRuns<T>(
	items: readonly T[],
	{
		key,
		indexOf = () => undefined,
		ownerOf = () => undefined,
	}: GroupRunsOptions<T>,
): CombatRun<T>[] {
	const runs: CombatRun<T>[] = []
	let run: T[] = []
	let runKey: string | undefined
	let places: (number | undefined)[] = []
	function close() {
		const steps = run.filter((item) => key(item) !== undefined)
		if (steps.length >= MIN_GROUP_SIZE) runs.push({ kind: "group", items: run })
		else for (const item of run) runs.push({ kind: "single", item })
		run = []
		runKey = undefined
		places = []
	}
	function follows(index: number | undefined) {
		const last = places.at(-1)
		return index === undefined || last === undefined || index === last + 1
	}
	for (const item of items) {
		const owner = ownerOf(item)
		if (owner !== undefined && run.length && places.includes(owner)) {
			run.push(item)
			continue
		}
		const itemKey = key(item)
		const index = indexOf(item)
		if (itemKey === undefined || itemKey !== runKey || !follows(index)) close()
		if (itemKey === undefined) {
			runs.push({ kind: "single", item })
			continue
		}
		runKey = itemKey
		run.push(item)
		places.push(index)
	}
	close()
	return runs
}

/** A group's timing and running total: its steps' starts and landings, and the rows' total after its last entry. */
export type GroupTiming = {
	starts: { first: number; last: number }
	lands?: { first: number; last: number }
	/** One of its steps lands after the next step started. */
	late: boolean
	dealt: number
	targetHealth: number
	healthShare: number
}

type TimedStep = {
	startsAt: number
	lands?: { first: number; last: number }
	late: boolean
}

/** A group's timing (`GroupTiming`) from its steps' rows and the row of its last entry. */
export function groupTiming(
	steps: readonly TimedStep[],
	last: Pick<GroupTiming, "dealt" | "targetHealth" | "healthShare">,
): GroupTiming | undefined {
	const [first] = steps
	const end = steps.at(-1)
	if (!first || !end) return undefined
	const landed = steps.flatMap(({ lands }) => (lands ? [lands] : []))
	const [firstLanding] = landed
	const lastLanding = landed.at(-1)
	return {
		starts: { first: first.startsAt, last: end.startsAt },
		...(firstLanding &&
			lastLanding && {
				lands: { first: firstLanding.first, last: lastLanding.last },
			}),
		late: steps.some(({ late }) => late),
		dealt: last.dealt,
		targetHealth: last.targetHealth,
		healthShare: last.healthShare,
	}
}

/** How many of a group's steps had something: "Hail of Blades 3/8". */
export type GroupCount = { label: string; count: number; of: number }

/** A damage over time over a group's steps: "applied · refreshed ×7 · 10 ticks · 240 magic · until 10.94 s". */
export type GroupDamageOverTime = {
	effectId: string
	name: string
	applications: {
		application: DamageOverTimeView["application"]
		count: number
	}[]
	ticks: number
	type?: DamageType
	raw: number
	final: number
	until: number
	notModeled: readonly string[]
}

/** What a collapsed group shows: its time range, damage by type and total, and what its steps did, counted. */
export type GroupView = {
	size: number
	/** The first and last steps' times; absent while the build loads. */
	time?: { from: number; to: number }
	/** Its steps' damage and their procs', by type: one colors the total, several split it. */
	byType: DamageTypeShare[]
	total: { raw: number; final: number }
	outcomes: (GroupCount & { id: string })[]
	marks: GroupCount[]
	effects: GroupCount[]
	damageOverTime: GroupDamageOverTime[]
	/** Steps that did not run (a cooldown): they add nothing. */
	refused: number
	/** Free mode: outcomes answered differently from the computed ones. */
	changes: number
	/** The target's health after the group's last step. */
	healthShare?: number
	/** The target's resistances its reductions changed after the group's last step. */
	resists: ResistChangeView[]
}

/** A step of a group, as its card has it. */
export type GroupStep = {
	time?: number
	refused?: string
	view?: StepView
	outcomes: readonly OutcomeView[]
}

/** Counts by label, in the order each label first shows. */
function countLabels(labels: readonly string[][], of: number): GroupCount[] {
	const counts = new Map<string, number>()
	for (const stepLabels of labels) {
		for (const label of new Set(stepLabels)) {
			counts.set(label, (counts.get(label) ?? 0) + 1)
		}
	}
	return [...counts].map(([label, count]) => ({ label, count, of }))
}

function outcomeCounts(steps: readonly GroupStep[]) {
	const counts = new Map<string, GroupCount & { id: string }>()
	for (const outcome of steps.flatMap(({ outcomes }) => outcomes)) {
		const count = counts.get(outcome.id) ?? {
			id: outcome.id,
			label: outcome.label,
			count: 0,
			of: 0,
		}
		count.of++
		if (outcome.happened) count.count++
		counts.set(outcome.id, count)
	}
	return [...counts.values()]
}

function damageOverTimeCounts(
	views: readonly DamageOverTimeView[],
): GroupDamageOverTime[] {
	const byEffect = new Map<string, GroupDamageOverTime>()
	for (const dot of views) {
		const group = byEffect.get(dot.effectId) ?? {
			effectId: dot.effectId,
			name: dot.name,
			applications: [],
			ticks: 0,
			raw: 0,
			final: 0,
			until: dot.until,
			notModeled: [],
		}
		const application = group.applications.find(
			(entry) => entry.application === dot.application,
		)
		if (application) application.count++
		else group.applications.push({ application: dot.application, count: 1 })
		group.ticks += dot.ticks.length
		group.raw += dot.raw
		group.final += dot.final
		if (dot.type) group.type = dot.type
		group.until = Math.max(group.until, dot.until)
		group.notModeled = [...new Set([...group.notModeled, ...dot.notModeled])]
		byEffect.set(dot.effectId, group)
	}
	return [...byEffect.values()]
}

/** A group's steps summed up: totals plus counts (issue 331, option A). The steps' own numbers, never recomputed. */
export function groupView(steps: readonly GroupStep[]): GroupView {
	const views = steps.flatMap(({ view }) => (view ? [view] : []))
	// Its steps' own damage and their procs', which a collapsed group lists nowhere else.
	const total = { raw: 0, final: 0 }
	for (const view of views) {
		for (const part of [view.total, ...view.procs.map(({ total }) => total)]) {
			total.raw += part.raw
			total.final += part.final
		}
	}
	const types = typeShares(
		views.flatMap((view) => [
			...view.byType,
			...view.procs.flatMap(({ byType }) => byType),
		]),
	)
	const times = steps.flatMap(({ time }) => (time === undefined ? [] : [time]))
	const first = times[0]
	const last = times.at(-1)
	const healthShare = views.at(-1)?.healthShare
	return {
		size: steps.length,
		...(first !== undefined &&
			last !== undefined && { time: { from: first, to: last } }),
		byType: types,
		total,
		outcomes: outcomeCounts(steps),
		marks: countLabels(
			views.map(({ marks }) =>
				marks.map(({ mark, change }) => `${mark} mark ${change}`),
			),
			steps.length,
		),
		effects: countLabels(
			views.map(({ effects }) =>
				effects.map(({ name, waiting }) =>
					waiting ? `${name} · ${waiting.label}` : name,
				),
			),
			steps.length,
		),
		damageOverTime: damageOverTimeCounts(
			views.flatMap(({ damageOverTime }) => damageOverTime),
		),
		refused: steps.filter(({ refused }) => refused).length,
		changes: steps
			.flatMap(({ outcomes }) => outcomes)
			.filter(({ changed }) => changed).length,
		...(healthShare !== undefined && { healthShare }),
		resists: views.at(-1)?.resists ?? [],
	}
}
