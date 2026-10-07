import {
	type ChampionSpell,
	DAMAGE_TYPES,
	type DamageType,
} from "@schemas/champion"
import type {
	CombatEvent,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageOverTimeSummary,
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

/** A step's hits from one source and of one type, as its card lists them (a cast's base and share of health). */
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

/** One tick in a damage over time's list: when it landed and what it dealt. */
export type TickView =
	| { time: number; type: DamageType; raw: number; final: number }
	| { time: number; notModeled: readonly string[] }

/**
 * A damage over time the step applied, as one line: "Toxic Shot · 4 ticks · 120 magic · until 4.00 s".
 * Its numbers add up by `effectId`, so a group of steps can sum them per source.
 */
export type DamageOverTimeView = {
	effectId: string
	name: string
	application: DamageOverTimeSummary["application"]
	stacks: number
	/** The ticks it owns, in time order, wherever they landed. */
	ticks: TickView[]
	/** Their damage type, when it has a number; all of one effect's share it. */
	type?: DamageType
	raw: number
	final: number
	/** Its last tick, or when it runs out when it owns none (a refresh that added none). */
	until: number
	/** When its effect took effect after a delay ("detonates" at 3.45 s). */
	delayed?: { label: string; at: number }
	notModeled: readonly string[]
}

/** What a step's card shows: its hits and total, the marks it moved and the effects running after it. */
export type StepView = {
	hits: HitView[]
	/** The damage over time it applied, with the ticks that belong to it. */
	damageOverTime: DamageOverTimeView[]
	total: { raw: number; final: number }
	/** The type of most of its damage, which colors the total. */
	mainType?: DamageType
	/** The marks it moved that no outcome reports (Valor marking during a wait); `fromMarker`: a marker put it there. */
	marks: { mark: string; change: "applied" | "consumed"; fromMarker: boolean }[]
	/** The effects running after it, with when each ends (none: until its `endsOn` event). */
	effects: { name: string; until?: number }[]
	healthShare: number
}

/** The step's hits, those of one source and type added up into one line; ticks show with their application. */
function hitViews(events: readonly CombatEvent[], names: CombatNames) {
	const views: HitView[] = []
	const lastHitAt = new Map<HitView, number>()
	for (const event of events) {
		if (event.kind !== "hit" || event.tick) continue
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

export function damageOverTimeView(
	{
		effectId,
		application,
		stacks,
		ticks,
		endsAt,
		delayed,
	}: DamageOverTimeSummary,
	names: CombatNames,
): DamageOverTimeView {
	const views = ticks.map(
		(tick): TickView =>
			"damage" in tick ? { time: tick.time, ...tick.damage } : tick,
	)
	let raw = 0
	let final = 0
	let type: DamageType | undefined
	for (const tick of views) {
		if (!("type" in tick)) continue
		raw += tick.raw
		final += tick.final
		type = tick.type
	}
	return {
		effectId,
		name: names.effect(effectId),
		application,
		stacks,
		ticks: views,
		...(type && { type }),
		raw,
		final,
		until: ticks.at(-1)?.time ?? endsAt,
		...(delayed && { delayed }),
		notModeled: [
			...new Set(
				views.flatMap((tick) => ("notModeled" in tick ? tick.notModeled : [])),
			),
		],
	}
}

/** The effects running after a step, each once; `hidden` ones another line reports. */
function runningEffects(
	step: CombatStep,
	{ names, hidden }: { names: CombatNames; hidden: ReadonlySet<string> },
): StepView["effects"] {
	const seen = new Map<string, StepView["effects"][number]>()
	for (const { effectId, holder, endsAt } of step.active) {
		if (hidden.has(effectId)) continue
		const name =
			holder === "target"
				? `${names.effect(effectId)} on the target`
				: names.effect(effectId)
		const until = Number.isFinite(endsAt) ? endsAt : undefined
		const key = `${name}@${until}`
		if (!seen.has(key))
			seen.set(key, { name, ...(until !== undefined && { until }) })
	}
	return [...seen.values()]
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
	const damageOverTime = step.damageOverTime.map((summary) =>
		damageOverTimeView(summary, names),
	)
	const ticking = new Set(damageOverTime.map(({ effectId }) => effectId))
	const total = { raw: 0, final: 0 }
	const byType = new Map<DamageType, number>()
	for (const hit of [...hits, ...damageOverTime]) {
		if (!("type" in hit) || !hit.type) continue
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
		damageOverTime,
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
		// An effect its outcome or its damage over time line already reports gets no chip of its own.
		effects: runningEffects(step, {
			names,
			hidden: new Set([...empowering, ...ticking]),
		}),
		healthShare: step.targetHealth / target.health,
	}
}

/**
 * The combo's totals: damage after mitigation, its share of the target's health, the time, the kill
 * (its step counted among the actions), and the markers strict mode had to force.
 */
export type CombatTotals = {
	final: number
	/** The damage types that dealt damage, in a fixed order (`damageTypeParts`). */
	byType: DamageTypePart[]
	healthShare: number
	duration: number
	kill?: { time: number; step: number }
	healthLeft: number
	forcedMarkers: number
	/** When the last effect or mark still running after the last damage ran out. */
	activeUntil: number
}

/** A damage type's part of the combo's damage after mitigation, in whole percent. */
export type DamageTypePart = {
	type: DamageType
	final: number
	percent: number
}

/**
 * The types that dealt damage, physical, magic then true, with whole percents that add up to 100:
 * each is rounded down, then the largest remainders get the points left.
 */
export function damageTypeParts(
	byType: CombatResult["byType"],
): DamageTypePart[] {
	const dealt = DAMAGE_TYPES.filter((type) => byType[type].final > 0)
	const total = dealt.reduce((sum, type) => sum + byType[type].final, 0)
	const exact = dealt.map((type) => (byType[type].final / total) * 100)
	const percents = exact.map(Math.floor)
	const left = 100 - percents.reduce((sum, percent) => sum + percent, 0)
	const byRemainder = exact
		.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
		.toSorted((a, b) => b.remainder - a.remainder)
	for (const { index } of byRemainder.slice(0, left)) {
		percents[index] = (percents[index] ?? 0) + 1
	}
	return dealt.map((type, index) => ({
		type,
		final: byType[type].final,
		percent: percents[index] ?? 0,
	}))
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
		byType: damageTypeParts(result.byType),
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
	kind: OutcomeKey["kind"]
	label: string
	happened: boolean
	detail?: string
	changed: boolean
}

/** What an outcome is about: the effect's name, or the mark's. */
function outcomeSubject(key: OutcomeKey, names: CombatNames) {
	return "mark" in key ? names.mark(key.mark) : names.effect(key.effectId)
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
		case "damage-over-time":
			return `${subject}: applies`
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
			kind: outcome.kind,
			label: outcomeLabel(outcome, names),
			happened: outcome.happened,
			...(detail && { detail }),
			changed: seeded !== undefined && seeded !== outcome.happened,
		}
	})
}

/** Strict mode's chips: a damage over time that was applied already has its line on the card. */
export function strictOutcomeViews(
	outcomes: readonly OutcomeView[],
): OutcomeView[] {
	return outcomes.filter(
		({ kind, happened }) => kind !== "damage-over-time" || !happened,
	)
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
