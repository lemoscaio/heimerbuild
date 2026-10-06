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

/** A step's hits from one source and of one type, as its card lists them (Ignite's 5 ticks are one line). */
export type HitView =
	| {
			name: string
			type: DamageType
			raw: number
			final: number
			count: number
	  }
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

/** The step's hits, those of one source and type added up into one line. */
function hitViews(events: readonly CombatEvent[], names: CombatNames) {
	const views: HitView[] = []
	for (const event of events) {
		if (event.kind !== "hit") continue
		const name = names.source(event.source)
		if (!("damage" in event)) {
			views.push({ name, notModeled: event.notModeled })
			continue
		}
		const { type, raw, final } = event.damage
		const same = views.find(
			(view) => "type" in view && view.name === name && view.type === type,
		)
		if (same && "type" in same) {
			same.raw += raw
			same.final += final
			same.count++
		} else views.push({ name, type, raw, final, count: 1 })
	}
	return views
}

export function stepView(
	step: CombatStep,
	{ names, target }: { names: CombatNames; target: CombatTarget },
): StepView {
	const hits = hitViews(step.events, names)
	const total = { raw: 0, final: 0 }
	const byType = new Map<DamageType, number>()
	for (const hit of hits) {
		if (!("type" in hit)) continue
		total.raw += hit.raw
		total.final += hit.final
		byType.set(hit.type, (byType.get(hit.type) ?? 0) + hit.final)
	}
	let mainType: DamageType | undefined
	for (const [type, final] of byType) {
		if (!mainType || final > (byType.get(mainType) ?? 0)) mainType = type
	}
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
			...new Set(
				step.active.map(({ effectId, holder }) =>
					holder === "target"
						? `${names.effect(effectId)} on the target`
						: names.effect(effectId),
				),
			),
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
