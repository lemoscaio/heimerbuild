import type { CombatEvent, CombatStep } from "@/lib/combat/combat"
import type { BuildEffect, Effect, Grant } from "@/lib/effects/effect"

export type HitEvent = Extract<CombatEvent, { kind: "hit" }>

/** The build's effects by id, which the hits' sources name. */
export type EffectsById = ReadonlyMap<string, BuildEffect>

export function effectsById(effects: readonly BuildEffect[]): EffectsById {
	return new Map(effects.map((effect) => [effect.id, effect]))
}

/** Two moments closer than this are one (a cast's base and share of health land together). */
const SAME_MOMENT = 1e-6

export function sameMoment(a: number, b: number) {
	return Math.abs(a - b) < SAME_MOMENT
}

/** Grants an effect deals as it takes effect, rather than on each hit (`onAttackDamage`, `bonusTrueDamage`). */
const OWN_DAMAGE: ReadonlySet<Grant["kind"]> = new Set([
	"damage",
	"abilityDamage",
	"applyOnHit",
])

function isSpentByOnHit({ endsOn }: Effect) {
	return [endsOn ?? []].flat().includes("on-hit")
}

/**
 * An effect whose damage is a hit of its own, not part of the hit that triggered it (issue 429): one
 * that lands after a `delay` or a state (Arcane Comet, Counter Strike), or a rune's or an item's that
 * deals its damage as it triggers (Kraken Slayer's third hit, Dark Harvest). An `on-hit` one is part
 * of the hit (Wit's End), unless a cooldown makes it a proc (Grasp of the Undying); so is a spellblade.
 */
export function isSeparateInstance(effect: Effect): boolean {
	if (effect.delay || effect.startsAfter) return true
	const { source, trigger, grants, cooldown } = effect
	if (source.kind !== "rune" && source.kind !== "item") return false
	if (!grants.some(({ kind }) => OWN_DAMAGE.has(kind))) return false
	if (isSpentByOnHit(effect)) return false
	return trigger.kind !== "on-hit" || cooldown !== undefined
}

/**
 * The separate damage instance a hit is part of, by the effect that dealt it: its own effect's, the
 * effect whose hit applied it as on-hit (a phantom hit), or a delayed one's; none for the step's own.
 */
export function hitInstance(
	event: HitEvent,
	effects: EffectsById,
): string | undefined {
	if (event.tick || event.source.kind !== "effect") return undefined
	const { effectId } = event.source
	const effect = effects.get(effectId)
	if (effect && isSeparateInstance(effect.effect)) return effectId
	if (event.onHitOf) return event.onHitOf.effectId
	return event.delayed ? effectId : undefined
}

/** Where a hit belongs: the step that triggered it (by item index), and its separate instance, if any. */
export type HitPlace = { step: number; instance?: string }

type PlaceHitOptions = {
	/** The step whose events hold the hit. */
	holder: number
	effects: EffectsById
}

/**
 * The one rule List, the expanded combo and the Timeline share (issue 429): a hit belongs to the
 * step that triggered it, a tick's application or a delayed hit's own step, else the step holding it.
 */
export function placeHit(
	event: HitEvent,
	{ holder, effects }: PlaceHitOptions,
): HitPlace {
	const step = event.tick?.owner ?? event.delayed?.owner ?? holder
	const instance = hitInstance(event, effects)
	return instance ? { step, instance } : { step }
}

/**
 * Each step with the hits that belong to it (`placeHit`): a delayed hit moves from the step running
 * when it landed to its own, by time; ticks stay where they landed, as their lines sum them up.
 */
export function placedSteps(
	steps: readonly CombatStep[],
	effects: EffectsById,
): CombatStep[] {
	const placed = steps.map(() => [] as CombatEvent[])
	steps.forEach(({ events }, holder) => {
		for (const event of events) {
			const index =
				event.kind === "hit" && !event.tick
					? placeHit(event, { holder, effects }).step
					: holder
			placed[index]?.push(event)
		}
	})
	return steps.map((step, index) => ({
		...step,
		events: (placed[index] ?? []).toSorted((a, b) => a.time - b.time),
	}))
}

/** A separate damage instance: one effect's hits for one step at one moment (a phantom hit's on-hit parts). */
export type Proc<Hit> = {
	effectId: string
	time: number
	hits: Hit[]
}

/** Hits of separate instances, each instance's together, in time order. */
export function groupProcs<Hit extends { time: number }>(
	hits: readonly (Hit & { instance: string })[],
): Proc<Hit>[] {
	const procs: Proc<Hit>[] = []
	for (const hit of hits.toSorted((a, b) => a.time - b.time)) {
		const same = procs.find(
			(proc) =>
				proc.effectId === hit.instance && sameMoment(proc.time, hit.time),
		)
		if (same) same.hits.push(hit)
		else procs.push({ effectId: hit.instance, time: hit.time, hits: [hit] })
	}
	return procs
}
