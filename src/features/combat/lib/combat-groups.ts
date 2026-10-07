import { DAMAGE_TYPES, type DamageType } from "@schemas/champion"
import type { CombatItem } from "@/lib/combat/combat"
import type { DamageOverTimeView, OutcomeView, StepView } from "./combat-view"

/** Identical steps in a row group from this many on (issue 331, option A). */
export const MIN_GROUP_SIZE = 3

/**
 * What makes two steps identical: the same action with the same inputs (a wait's length, an
 * ability's variant). A marker never is, so it always splits a group.
 */
export function actionKey(action: CombatItem): string | undefined {
	switch (action.kind) {
		case "situation":
			return undefined
		case "attack":
			return "attack"
		case "ability":
			return `ability:${action.slot}:${action.variant ?? ""}`
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

/** The items in order, each run of `MIN_GROUP_SIZE` or more with the same key as one group. */
export function groupRuns<T>(
	items: readonly T[],
	key: (item: T) => string | undefined,
): CombatRun<T>[] {
	const runs: CombatRun<T>[] = []
	let run: T[] = []
	let runKey: string | undefined
	function close() {
		if (run.length >= MIN_GROUP_SIZE) runs.push({ kind: "group", items: run })
		else for (const item of run) runs.push({ kind: "single", item })
		run = []
	}
	for (const item of items) {
		const itemKey = key(item)
		if (itemKey === undefined || itemKey !== runKey) close()
		runKey = itemKey
		if (itemKey === undefined) runs.push({ kind: "single", item })
		else run.push(item)
	}
	close()
	return runs
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
	byType: { type: DamageType; final: number }[]
	total: { raw: number; final: number }
	mainType?: DamageType
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
	const total = { raw: 0, final: 0 }
	const byType = new Map<DamageType, number>()
	for (const view of views) {
		total.raw += view.total.raw
		total.final += view.total.final
		for (const part of [...view.hits, ...view.damageOverTime]) {
			if (!("type" in part) || !part.type) continue
			byType.set(part.type, (byType.get(part.type) ?? 0) + part.final)
		}
	}
	const types = DAMAGE_TYPES.flatMap((type) => {
		const final = byType.get(type) ?? 0
		return final > 0 ? [{ type, final }] : []
	})
	const mainType = types.reduce<(typeof types)[number] | undefined>(
		(main, part) => (!main || part.final > main.final ? part : main),
		undefined,
	)?.type
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
		...(mainType && { mainType }),
		outcomes: outcomeCounts(steps),
		marks: countLabels(
			views.map(({ marks }) =>
				marks.map(({ mark, change }) => `${mark} mark ${change}`),
			),
			steps.length,
		),
		effects: countLabels(
			views.map(({ effects }) => effects.map(({ name }) => name)),
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
	}
}
