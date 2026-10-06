import type { ChampionSpell, DamageType } from "@schemas/champion"
import type {
	CombatEvent,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
	OutcomeChoices,
	OutcomeKey,
	StepOutcome,
} from "@/lib/combat/combat"
import { outcomeId } from "@/lib/combat/outcomes"
import type { BuildEffect, StartOption } from "@/lib/effects/effect"
import { formatSeconds } from "./combat-format"

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

/** What a step says when its result comes from a situation marker. */
export const FROM_MARKER = "(from marker)"

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
				const name = effectById.get(source.effectId)?.name ?? source.effectId
				return source.fromSituation ? `${name} ${FROM_MARKER}` : name
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
			/** Hits at different moments: a cast's base and share of health land together, once. */
			count: number
	  }
	| { name: string; notModeled: readonly string[] }

/** What a step's card shows: its hits and total, the marks it moved and the effects running after it. */
export type StepView = {
	hits: HitView[]
	total: { raw: number; final: number }
	/** The type of most of its damage, which colors the total. */
	mainType?: DamageType
	/** The marks it moved that no outcome reports (Valor marking during a wait); `fromMarker`: a marker put it there. */
	marks: { mark: string; change: "applied" | "consumed"; fromMarker: boolean }[]
	effects: string[]
	healthShare: number
}

/** The step's hits, those of one source and type added up into one line. */
function hitViews(events: readonly CombatEvent[], names: CombatNames) {
	const views: HitView[] = []
	const lastHitAt = new Map<HitView, number>()
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
			if (lastHitAt.get(same) !== event.time) same.count++
			lastHitAt.set(same, event.time)
		} else {
			const view = { name, type, raw, final, count: 1 }
			views.push(view)
			lastHitAt.set(view, event.time)
		}
	}
	return views
}

export function stepView(
	step: CombatStep,
	{ names, target }: { names: CombatNames; target: CombatTarget },
): StepView {
	const reported = new Set(step.outcomes.map(outcomeId))
	const empowering = new Set(
		step.outcomes.flatMap((outcome) =>
			outcome.kind === "empowered" ? [outcome.effectId] : [],
		),
	)
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
			(event.kind === "mark-applied" || event.kind === "mark-consumed") &&
			!reported.has(outcomeId({ kind: event.kind, mark: event.mark }))
				? [
						{
							mark: names.mark(event.mark),
							change:
								event.kind === "mark-applied"
									? ("applied" as const)
									: ("consumed" as const),
							fromMarker:
								event.kind === "mark-consumed" && !!event.fromSituation,
						},
					]
				: [],
		),
		// An effect its outcome already reports (Hail of Blades 2/3) gets no chip of its own.
		effects: [
			...new Set(
				step.active.flatMap(({ effectId, holder, endsAt }) => {
					if (empowering.has(effectId)) return []
					const name =
						holder === "target"
							? `${names.effect(effectId)} on the target`
							: names.effect(effectId)
					return Number.isFinite(endsAt)
						? [`${name} · until ${formatSeconds(endsAt)}`]
						: [name]
				}),
			),
		],
		healthShare: step.targetHealth / target.health,
	}
}

/**
 * The combo's totals: damage after mitigation, its share of the target's health, the time, the kill
 * (its step counted among the actions), and the markers strict mode had to force.
 */
export type CombatTotals = {
	final: number
	healthShare: number
	duration: number
	kill?: { time: number; step: number }
	healthLeft: number
	forcedMarkers: number
	/** When the last effect or mark still running after the last damage ran out. */
	activeUntil: number
}

/** Each item's number among the actions, 1-based; markers have none. */
export function actionNumbers(
	items: readonly Pick<CombatStep, "action">[],
): (number | undefined)[] {
	let count = 0
	return items.map(({ action }) =>
		action.kind === "situation" ? undefined : ++count,
	)
}

export function combatTotals(
	result: CombatResult,
	target: CombatTarget,
): CombatTotals {
	const final = result.total.final
	const kill = result.kill && {
		time: result.kill.time,
		step: actionNumbers(result.steps)[result.kill.step] ?? 0,
	}
	return {
		final,
		healthShare: Math.min(1, final / target.health),
		duration: result.duration,
		...(kill && { kill }),
		healthLeft: Math.max(0, target.health - final),
		activeUntil: result.activeUntil,
		forcedMarkers: result.steps.filter(
			({ situation }) => situation?.status === "forced",
		).length,
	}
}

/**
 * An outcome as its chip shows it: "Hail of Blades" with its charge (1/3) or when it is ready
 * again, "Harrier: consumes the mark". `changed`: free mode's choice differs from the computed one.
 */
export type OutcomeView = {
	id: string
	label: string
	happened: boolean
	detail?: string
	changed: boolean
}

/** What an outcome is about: the effect's name, or the mark's. */
function outcomeSubject(key: OutcomeKey, names: CombatNames) {
	return key.kind === "empowered"
		? names.effect(key.effectId)
		: names.mark(key.mark)
}

function outcomeLabel(key: OutcomeKey, names: CombatNames) {
	const subject = outcomeSubject(key, names)
	switch (key.kind) {
		case "empowered":
			return subject
		case "mark-applied":
			return `${subject}: applies the mark`
		case "mark-consumed":
			return `${subject}: consumes the mark`
	}
}

function outcomeDetail({ happened, charge, readyAt }: StepOutcome) {
	if (charge) return `${charge.used}/${charge.max}`
	if (!happened && readyAt !== undefined) {
		return `on cooldown · ready at ${formatSeconds(readyAt)}`
	}
	return undefined
}

type OutcomeViewsOptions = {
	names: CombatNames
	/** Free mode's computed outcomes at the step, which `changed` compares with. */
	seed?: OutcomeChoices
}

export function outcomeViews(
	outcomes: readonly StepOutcome[],
	{ names, seed }: OutcomeViewsOptions,
): OutcomeView[] {
	return outcomes.map((outcome) => {
		const id = outcomeId(outcome)
		const detail = outcomeDetail(outcome)
		const seeded = seed?.[id]
		return {
			id,
			label: outcomeLabel(outcome, names),
			happened: outcome.happened,
			...(detail && { detail }),
			changed: seeded !== undefined && seeded !== outcome.happened,
		}
	})
}

/** The choice to keep when the user answers an outcome: none when it is the computed one again. */
export function outcomeChoice(
	{ happened, changed }: Pick<OutcomeView, "happened" | "changed">,
	answer: boolean,
): boolean | undefined {
	const computed = changed ? !happened : happened
	return answer === computed ? undefined : answer
}

/**
 * What an ability step says about the outcomes only attacks have: "Hail of Blades and Harrier:
 * attacks only". Nothing when every attack outcome applies to it too.
 */
export function attacksOnlyNote(
	stepOutcomes: readonly OutcomeKey[],
	attackOutcomes: readonly OutcomeKey[],
	names: CombatNames,
): string | undefined {
	const own = new Set(stepOutcomes.map(outcomeId))
	const subjects = [
		...new Set(
			attackOutcomes
				.filter((key) => !own.has(outcomeId(key)))
				.map((key) => outcomeSubject(key, names)),
		),
	]
	if (!subjects.length) return undefined
	const list =
		subjects.length === 1
			? subjects[0]
			: `${subjects.slice(0, -1).join(", ")} and ${subjects.at(-1)}`
	return `${list}: attacks only`
}

/** A marker line: its situation, and what it did ("at the start", "on cooldown until 10.40 s · forced"). */
export type MarkerView = {
	label: string
	detail: string
	tone: "applied" | "forced" | "ignored" | "no-effect"
}

const NO_EFFECT_DETAILS = {
	"already-marked": "already marked · no effect",
	"already-running": "already active · no effect",
	unavailable: "not in this build · no effect",
} as const

type MarkerViewOptions = {
	label: string
	/** No action before it: the old starting situation. */
	atStart: boolean
	/** Free mode: a marker only applies its result. */
	free: boolean
	/** Its situation's kind: a "ready" one says when its effect came back. */
	kind?: StartOption["kind"]
}

export function markerView(
	step: Pick<CombatStep, "situation">,
	{ label, atStart, free, kind }: MarkerViewOptions,
): MarkerView {
	const where = atStart ? "at the start" : "from here"
	const { situation } = step
	if (situation?.status === "no-effect") {
		return {
			label,
			detail: NO_EFFECT_DETAILS[situation.reason],
			tone: "no-effect",
		}
	}
	if (situation?.status === "ignored") {
		return {
			label,
			detail: `on cooldown until ${formatSeconds(situation.readyAt)} · ignored (use Free mode to force it)`,
			tone: "ignored",
		}
	}
	if (situation?.status === "forced") {
		return {
			label,
			detail: `on cooldown until ${formatSeconds(situation.readyAt)} · forced`,
			tone: "forced",
		}
	}
	if (free) return { label, detail: `applies: ${where}`, tone: "applied" }
	const readyAt = situation?.readyAt
	return {
		label,
		detail:
			readyAt === undefined || atStart || kind !== "ready"
				? where
				: `ready again here (since ${formatSeconds(readyAt)})`,
		tone: "applied",
	}
}
