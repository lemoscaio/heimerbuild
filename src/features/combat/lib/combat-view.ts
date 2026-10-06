import type { ChampionSpell, DamageType } from "@schemas/champion"
import type {
	CombatEvent,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
} from "@/lib/combat/combat"
import type { BuildEffect } from "@/lib/effects/effect"

/** The names the combo shows for the abilities, effects and marks it reports by id. */
export type CombatNames = {
	source: (source: DamageSource) => string
	effect: (effectId: string) => string
	mark: (mark: string) => string
}

type CombatNamesInput = {
	passiveName: string
	spells: readonly Pick<ChampionSpell, "slot" | "name">[]
	effects: readonly BuildEffect[]
}

const PART_NAMES = { passive: "passive", active: "active" } as const

function effectName({ name, effect }: BuildEffect) {
	const detail = effect.label ?? (effect.part && PART_NAMES[effect.part])
	return detail ? `${name} (${detail})` : name
}

export function combatNames({
	passiveName,
	spells,
	effects,
}: CombatNamesInput): CombatNames {
	const effectById = new Map(effects.map((effect) => [effect.id, effect]))
	return {
		source(source) {
			if (source.kind === "attack") return "Attack"
			if (source.kind === "effect") {
				const effect = effectById.get(source.effectId)
				return effect ? effect.name : source.effectId
			}
			if (source.slot === "passive") return passiveName
			return (
				spells.find(({ slot }) => slot === source.slot)?.name ?? source.slot
			)
		},
		effect(effectId) {
			const effect = effectById.get(effectId)
			return effect ? effectName(effect) : effectId
		},
		mark(mark) {
			return (
				effects.find(({ effect }) => effect.applies?.mark === mark)?.name ??
				mark
			)
		},
	}
}

/** One hit of a step, as its card lists it. */
export type HitView =
	| { name: string; type: DamageType; raw: number; final: number }
	| { name: string; notModeled: readonly string[] }

/** What a step's card shows: its hits and total, the marks it moved and the effects running after it. */
export type StepView = {
	hits: HitView[]
	total: { raw: number; final: number }
	/** The type of most of its damage, which colors the total. */
	mainType?: DamageType
	marks: { mark: string; change: "applied" | "consumed" }[]
	effects: string[]
	healthShare: number
}

function hitView(event: CombatEvent, names: CombatNames): HitView[] {
	if (event.kind !== "hit") return []
	const name = names.source(event.source)
	return "damage" in event
		? [{ name, ...event.damage }]
		: [{ name, notModeled: event.notModeled }]
}

export function stepView(
	step: CombatStep,
	{ names, target }: { names: CombatNames; target: CombatTarget },
): StepView {
	const hits = step.events.flatMap((event) => hitView(event, names))
	const total = { raw: 0, final: 0 }
	const byType = new Map<DamageType, number>()
	for (const hit of hits) {
		if (!("type" in hit)) continue
		total.raw += hit.raw
		total.final += hit.final
		byType.set(hit.type, (byType.get(hit.type) ?? 0) + hit.final)
	}
	const mainType = [...byType].sort(([, a], [, b]) => b - a)[0]?.[0]
	return {
		hits,
		total,
		...(mainType && { mainType }),
		marks: step.events.flatMap((event) =>
			event.kind === "mark-applied" || event.kind === "mark-consumed"
				? [
						{
							mark: names.mark(event.mark),
							change:
								event.kind === "mark-applied"
									? ("applied" as const)
									: ("consumed" as const),
						},
					]
				: [],
		),
		effects: [
			...new Set(step.active.map(({ effectId }) => names.effect(effectId))),
		],
		healthShare: step.targetHealth / target.health,
	}
}

/** The combo's totals: damage after mitigation, its share of the target's health, the time, the kill. */
export type CombatTotals = {
	final: number
	healthShare: number
	duration: number
	kill?: { time: number; step: number }
	healthLeft: number
}

export function combatTotals(
	result: CombatResult,
	target: CombatTarget,
): CombatTotals {
	const final = result.total.final
	return {
		final,
		healthShare: Math.min(1, final / target.health),
		duration: result.duration,
		...(result.kill && { kill: result.kill }),
		healthLeft: Math.max(0, target.health - final),
	}
}
