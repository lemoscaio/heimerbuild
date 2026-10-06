import type { DamageOverTimeGrant } from "../effects/effect"
import type {
	CombatEvent,
	DamageOverTimeSummary,
	DamageOverTimeTick,
} from "./combat"

/** Ticks at 0.25 s steps add up float errors; a tick this close to its end still lands. */
const EPSILON = 1e-9

/** One application of a damage over time: who applied it (an item index), when, and until when it covers ticks. */
export type DamageOverTimeApplication = {
	effectId: string
	owner: number
	at: number
	endsAt: number
	kind: DamageOverTimeSummary["application"]
	stacks: number
	/** Its effect's `delay` label when it took effect after its trigger ("detonates"). */
	delayed?: string
}

type TickTiming = Pick<DamageOverTimeGrant, "every" | "firstTick">

/** When tick `index` (0-based) of a damage over time started at `startedAt` lands. */
export function tickTime(
	startedAt: number,
	index: number,
	{ every, firstTick }: TickTiming,
): number {
	return startedAt + (firstTick === "delayed" ? index + 1 : index) * every
}

/** Whether a tick at `at` lands before an application running until `endsAt` is over: a delayed one's last lands at the end. */
export function coversTick(
	at: number,
	endsAt: number,
	{ firstTick }: Pick<DamageOverTimeGrant, "firstTick">,
): boolean {
	return firstTick === "delayed"
		? at <= endsAt + EPSILON
		: at < endsAt - EPSILON
}

/**
 * The application a tick belongs to: the first that covers it, so a refresh owns only the ticks it
 * added. Toxic Shot from 3 attacks 0.7 s apart: the first owns the ticks at 1 to 4 s, the third the one at 5 s.
 */
export function tickOwner(
	applications: readonly DamageOverTimeApplication[],
	at: number,
	timing: Pick<DamageOverTimeGrant, "firstTick">,
): DamageOverTimeApplication | undefined {
	return (
		applications.find(({ endsAt }) => coversTick(at, endsAt, timing)) ??
		applications.at(-1)
	)
}

function ownTicks(
	events: readonly CombatEvent[],
	owner: number,
	effectId: string,
): DamageOverTimeTick[] {
	return events.flatMap((event): DamageOverTimeTick[] => {
		if (event.kind !== "hit" || event.tick?.owner !== owner) return []
		if (event.source.kind !== "effect" || event.source.effectId !== effectId) {
			return []
		}
		return "damage" in event
			? [{ time: event.time, damage: event.damage }]
			: [{ time: event.time, notModeled: event.notModeled }]
	})
}

/**
 * Each step's damage over time, by item index: one summary per effect it applied, refreshed or
 * stacked, with the ticks it owns wherever they landed.
 */
export function damageOverTimeSummaries(
	applications: readonly DamageOverTimeApplication[],
	events: readonly CombatEvent[],
	items: number,
): DamageOverTimeSummary[][] {
	const byStep = Array.from(
		{ length: items },
		() => new Map<string, DamageOverTimeSummary>(),
	)
	for (const application of applications) {
		const { effectId, owner, at, endsAt, kind, stacks, delayed } = application
		const summaries = byStep[owner]
		if (!summaries) continue
		const summary = summaries.get(effectId)
		if (summary) {
			summary.stacks = stacks
			summary.endsAt = Math.max(summary.endsAt, endsAt)
			continue
		}
		summaries.set(effectId, {
			effectId,
			application: kind,
			stacks,
			ticks: ownTicks(events, owner, effectId),
			endsAt,
			...(delayed && { delayed: { label: delayed, at } }),
		})
	}
	return byStep.map((summaries) => [...summaries.values()])
}
