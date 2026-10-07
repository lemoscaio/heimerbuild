import type {
	AbilitySlot,
	Champion,
	ChampionSpell,
	DamageType,
} from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { isOnByDefault, isSwitchable } from "../effects/defaults"
import type {
	Amount,
	BuildEffect,
	DamageOverTimeGrant,
	DamageRatios,
	EndsOn,
	Grant,
	MarkApplication,
	MarkConsumer,
	PauseOn,
	SlotCast,
	Trigger,
} from "../effects/effect"
import {
	type EffectContext,
	effectDuration,
	isInForm,
	resolveAmount,
} from "../effects/evaluate"
import { abilitiesInForm } from "../form-abilities"
import { itemsAdaptiveType } from "../stats/adaptive-force"
import { selectedForm } from "../stats/champion-forms"
import {
	type BuildStatsInput,
	computeBuildStats,
} from "../stats/compute-build-stats"
import type { ComputedStats } from "../stats/compute-stats"
import { attackTypeAtLevel } from "../stats/level-states"
import { spellCooldown } from "../summoner-rune-interactions"
import type { SummonerSlot } from "../summoner-slots"
import { isCastOwnEffect } from "./area-ticks"
import type {
	ActiveEffect,
	CombatAction,
	CombatEvent,
	CombatItem,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
	DamageTotals,
	EffectHolder,
	OutcomeChoices,
	OutcomeKey,
	SituationStatus,
	StepOutcome,
	TickOwner,
	WaitingEffect,
} from "./combat"
import { abilityCooldown, evaluateDamage, targetHealth } from "./damage-formula"
import {
	coversTick,
	type DamageOverTimeApplication,
	damageOverTimeSummaries,
	tickOwner,
	ticksInArea,
	tickTime,
} from "./damage-over-time"
import { mitigate } from "./mitigation"
import {
	dealsDamageOverTime,
	outcomeChoices,
	outcomeId,
	outcomeKeys,
} from "./outcomes"
import {
	ABILITY_HIT_RULES,
	type AbilityHitRule,
	type AbilityVariant,
	findHitRule,
} from "./registries/ability-hits"

/** The build as the stats engine reads it, with the whole champion (its abilities and their damage). */
export type CombatBuild = Omit<BuildStatsInput, "champion" | "effects"> & {
	champion: Champion
}

export type CombatInput = {
	build: CombatBuild
	/** The build's effects, its items' included (`combatEffects`). */
	effects: readonly BuildEffect[]
	/** The summoner spells by slot. */
	summoners: readonly (SummonerSpell | undefined)[]
	target: CombatTarget
	/** The actions and situation markers, in order (a marker's effect declares a `start`). */
	actions: readonly CombatItem[]
	/**
	 * Free mode: cooldowns don't refuse an action, and `outcomes` (by item, `outcomeId`) set what
	 * happens; an outcome without a choice follows the rules.
	 */
	free?: { outcomes?: readonly (OutcomeChoices | undefined)[] }
}

export type SimulateCombatOptions = {
	/** How abilities hit; the curated rules by default. */
	hitRules?: readonly AbilityHitRule[]
}

type Instance = {
	effect: BuildEffect
	holder: EffectHolder
	startedAt: number
	/** When it last triggered (a refresh included), which its grants' own clocks read. */
	triggeredAt: number
	endsAt: number
	stacks: number
	/** Ticks of a damage over time dealt so far. */
	ticks: number
	/** A damage over time's applications, which own its ticks (`tickOwner`). */
	applications: DamageOverTimeApplication[]
	/** The attacker's stats its ticks read, taken at each application (Toxic Shot doesn't follow later AP). */
	stats?: ComputedStats
	/** The attacks it empowered of its `charges` (Hail of Blades). */
	charges?: { used: number; max: number }
	/** Running from a situation marker. */
	fromSituation?: true
	/** When its pause (`pauses`) ends, set by the last event that started one. */
	pausedUntil?: number
	/** A time in its cast's area: its ticks land up to this moment included (`ticksInArea`). */
	lastTickAt?: number
}

/** A mark and the effect that applied it, whose cooldown may start when it leaves (`cooldownFrom`). */
type PendingMark = MarkApplication & { by: BuildEffect }

type Mark = PendingMark & { endsAt: number; fromSituation?: true }

/** What an `on-attack` effect did for the attack running. */
type Empowered = Omit<StepOutcome, keyof OutcomeKey>

type Simulation = {
	input: CombatInput
	hitRules: readonly AbilityHitRule[]
	/** The champion's abilities as its form shows them. */
	spells: readonly ChampionSpell[]
	formId: string | undefined
	context: EffectContext
	time: number
	/** When the action running ends: an attack after 1 / attack speed, an ability after its cast time. */
	busyUntil: number
	nextAttackAt: number
	/** When each ability ("Q") or summoner slot ("summoner-0") is ready again. */
	cooldowns: Map<string, number>
	/** When each effect can trigger again. */
	effectsReadyAt: Map<string, number>
	active: Instance[]
	marks: Mark[]
	/** When each mark last left the target, which a periodic effect's `idle` waits on. */
	markClearedAt: Map<string, number>
	health: number
	log: CombatEvent[]
	step: number
	kill?: { time: number; step: number }
	/** Free mode: no cooldown refuses an action. */
	free: boolean
	/** Free mode's choices for the action running. */
	forced?: OutcomeChoices
	/** Where the action running starts in the log, and what its `on-attack` effects did. */
	actionStart: number
	empowered: Map<string, Empowered>
	/** Effects whose cooldown is still the one assumed at the start, not a use in the combo. */
	assumedCooldowns: Set<string>
	/** Every application of a damage over time, in order. */
	applications: DamageOverTimeApplication[]
	/** The step whose tick is landing now, which owns what the tick triggers (Liandry's burn). */
	owner?: number
	/** Ability damage is triggering its effects now, so their own damage doesn't loop. */
	onAbilityDamage: boolean
	/** Effects with a `delay` waiting to take effect, and the step that triggered each. */
	delayed: Delayed[]
	/** Effects in their `startsAfter` state, until an event breaks it or `until`. */
	waiting: Waiting[]
}

type Delayed = {
	at: number
	effect: BuildEffect
	owner: number
	duration?: number
}

type Waiting = { until: number; effect: BuildEffect; owner: number }

/** Marks to put on the target once the action's hit is done (Vault deals its damage, then marks). */
type PendingMarks = PendingMark[]

/**
 * A periodic or situational effect (Valor, Hail of Blades) starts the combo on its cooldown, as if
 * just used, unless a marker before the first action sets its situation.
 */
function startCooldowns(sim: Simulation) {
	const firstAction = sim.input.actions.findIndex(
		(item) => item.kind !== "situation",
	)
	const leading = new Set(
		sim.input.actions
			.slice(0, firstAction === -1 ? undefined : firstAction)
			.flatMap((item) => (item.kind === "situation" ? [item.effectId] : [])),
	)
	for (const effect of sim.input.effects) {
		const { trigger, start } = effect.effect
		if (!isInForm(effect, sim.formId) || leading.has(effect.id)) continue
		if (trigger.kind === "periodic" || start) {
			startCooldown(sim, effect)
			sim.assumedCooldowns.add(effect.id)
		}
	}
}

function newInstance(
	sim: Simulation,
	effect: BuildEffect,
	duration: number,
): Instance {
	const { holder, charges } = effect.effect
	return {
		effect,
		holder: holder ?? "attacker",
		startedAt: sim.time,
		triggeredAt: sim.time,
		endsAt: sim.time + duration,
		stacks: 1,
		ticks: 0,
		applications: [],
		...(charges && { charges: { used: 0, max: charges } }),
	}
}

/** Why a marker's situation already holds, if it does: nothing for it to change. */
function situationHolds(
	sim: Simulation,
	effect: BuildEffect,
): SituationStatus | undefined {
	const { start, applies } = effect.effect
	if (start?.kind === "marked") {
		if (!applies) return { status: "no-effect", reason: "unavailable" }
		return sim.marks.some(({ mark }) => mark === applies.mark)
			? { status: "no-effect", reason: "already-marked" }
			: undefined
	}
	return sim.active.some((instance) => instance.effect === effect)
		? { status: "no-effect", reason: "already-running" }
		: undefined
}

/**
 * A marker sets its effect's situation from here: its mark on the target, the effect running, or
 * its cooldown over. While a use in the combo has it on cooldown, strict mode ignores the marker
 * and free mode forces it; the cooldown assumed at the start blocks nothing.
 */
function applySituation(sim: Simulation, effectId: string): SituationStatus {
	const effect = sim.input.effects.find(({ id }) => id === effectId)
	const start = effect?.effect.start
	if (!effect || !start || !isInForm(effect, sim.formId)) {
		return { status: "no-effect", reason: "unavailable" }
	}
	const holds = situationHolds(sim, effect)
	if (holds) return holds
	const readyAt = sim.effectsReadyAt.get(effect.id)
	const assumed = sim.assumedCooldowns.has(effect.id)
	const blocked = readyAt !== undefined && readyAt > sim.time && !assumed
	if (blocked && !sim.free) return { status: "ignored", readyAt }
	const { applies } = effect.effect
	switch (start.kind) {
		case "marked":
			if (!applies) return { status: "no-effect", reason: "unavailable" }
			sim.marks.push({
				...applies,
				by: effect,
				endsAt: sim.time + applies.duration,
				fromSituation: true,
			})
			break
		case "running":
			sim.active.push({
				...newInstance(
					sim,
					effect,
					effectDuration(effect, sim.context) ?? Number.POSITIVE_INFINITY,
				),
				fromSituation: true,
			})
			break
		case "ready":
			sim.effectsReadyAt.delete(effect.id)
			sim.assumedCooldowns.delete(effect.id)
			break
	}
	if (blocked) return { status: "forced", readyAt }
	return readyAt === undefined || assumed
		? { status: "applied" }
		: { status: "applied", readyAt }
}

function createSimulation(
	input: CombatInput,
	hitRules: readonly AbilityHitRule[],
): Simulation {
	const { champion, form, ranks, level, items } = input.build
	const formId = selectedForm(champion.forms, form, { ranks })?.id
	const startsOn = input.effects.filter(
		({ effect }) => isOnByDefault(effect) && effect.holder !== "target",
	)
	const sim: Simulation = {
		input,
		hitRules,
		spells: abilitiesInForm(champion.abilities, formId).spells,
		formId,
		context: {
			level,
			ranks,
			rankStats: champion.rankStats,
			currentHealth: input.build.currentHealth,
			gameTime: input.build.gameTime,
			adaptiveType: itemsAdaptiveType(champion.adaptiveType, items),
			form: formId,
			attackType: attackTypeAtLevel(champion, level, { form: formId, ranks }),
		},
		time: 0,
		busyUntil: 0,
		nextAttackAt: 0,
		cooldowns: new Map(),
		effectsReadyAt: new Map(),
		// Decision 7: the combo starts from the trigger defaults, never the panel's switches.
		active: startsOn.map((effect) => ({
			effect,
			holder: "attacker",
			startedAt: 0,
			triggeredAt: 0,
			endsAt: Number.POSITIVE_INFINITY,
			stacks: 1,
			ticks: 0,
			applications: [],
		})),
		marks: [],
		markClearedAt: new Map(),
		health: input.target.health,
		log: [],
		step: 0,
		free: !!input.free,
		actionStart: 0,
		empowered: new Map(),
		assumedCooldowns: new Set(),
		applications: [],
		onAbilityDamage: false,
		delayed: [],
		waiting: [],
	}
	startCooldowns(sim)
	return sim
}

/** The attacker's stats now: `computeBuildStats` with the effects running on the attacker. */
function statsNow(sim: Simulation): ComputedStats {
	const own = sim.input.effects.filter(
		({ effect }) => effect.holder !== "target",
	)
	const running = sim.active.filter(({ holder }) => holder === "attacker")
	const runningIds = new Set(running.map(({ effect }) => effect.id))
	const paused = new Set(
		running
			.filter((instance) => isPausedNow(sim, instance))
			.map(({ effect }) => effect.id),
	)
	return computeBuildStats({
		...sim.input.build,
		effects: {
			available: own,
			overrides: Object.fromEntries(
				own
					.filter(({ effect }) => isSwitchable(effect))
					.map(({ id }) => [id, runningIds.has(id)]),
			),
			stacks: Object.fromEntries(
				running.map(({ effect, stacks }) => [effect.id, stacks]),
			),
			paused,
			elapsed: Object.fromEntries(
				running.map(({ effect, triggeredAt }) => [
					effect.id,
					sim.time - triggeredAt,
				]),
			),
		},
	})
}

type Damage = {
	source: DamageSource
	type: DamageType
	raw: number
	/** A damage over time's tick, and the step it belongs to. */
	tick?: TickOwner
}

function deal(sim: Simulation, { source, type, raw, tick }: Damage) {
	const final = mitigate(raw, type, {
		target: sim.input.target,
		attacker: statsNow(sim),
	})
	sim.health = Math.max(0, sim.health - final)
	if (sim.health === 0 && !sim.kill) {
		sim.kill = { time: sim.time, step: sim.step }
	}
	sim.log.push({
		kind: "hit",
		time: sim.time,
		source,
		damage: { type, raw, final },
		...(tick && { tick }),
	})
	triggerOnAbilityDamage(sim, source)
}

function notModeledHit(
	sim: Simulation,
	source: DamageSource,
	reasons: readonly string[],
	tick?: TickOwner,
) {
	sim.log.push({
		kind: "hit",
		time: sim.time,
		source,
		notModeled: reasons,
		...(tick && { tick }),
	})
	triggerOnAbilityDamage(sim, source)
}

/** An ability's damage: its cast's, or an effect's whose source is an ability (Toxic Shot's poison). */
function isAbilityDamage(sim: Simulation, source: DamageSource) {
	if (source.kind === "ability") return true
	if (source.kind !== "effect") return false
	const effect = sim.input.effects.find(({ id }) => id === source.effectId)
	return effect?.effect.source.kind === "ability"
}

/** Ability damage landing triggers the `on-ability-damage` effects (Liandry's burn). */
function triggerOnAbilityDamage(sim: Simulation, source: DamageSource) {
	if (sim.onAbilityDamage || !isAbilityDamage(sim, source)) return
	sim.onAbilityDamage = true
	const pending: PendingMarks = []
	triggerWhere(sim, ({ kind }) => kind === "on-ability-damage", pending)
	applyMarks(sim, pending)
	sim.onAbilityDamage = false
}

type AbilityDamageOptions = {
	/** The target's health its share reads; the current one by default. */
	targetHealth?: number
}

/** An ability's synced damage formula by name, as the form shows the ability. */
function abilityFormula(
	sim: Simulation,
	ability: AbilitySlot | "passive",
	name: string,
) {
	const damage =
		ability === "passive"
			? sim.input.build.champion.abilities.passive.damage
			: sim.spells.find(({ slot }) => slot === ability)?.damage
	return damage?.find((entry) => entry.name === name)
}

/** A synced ability damage by name (`abilityDamage` grant or a cast's hit), at the ability's rank. */
function dealAbilityDamage(
	sim: Simulation,
	ability: AbilitySlot | "passive",
	name: string,
	source: DamageSource,
	{ targetHealth = sim.health }: AbilityDamageOptions = {},
) {
	const { ranks, level } = sim.input.build
	const formula = abilityFormula(sim, ability, name)
	if (!formula) {
		notModeledHit(sim, source, [`no synced damage named ${name}`])
		return
	}
	const raw = evaluateDamage(formula, {
		stats: statsNow(sim),
		level,
		...(ability !== "passive" && { rank: ranks?.[ability] }),
		target: { maximum: sim.input.target.health, current: targetHealth },
	})
	if (raw === undefined) {
		notModeledHit(sim, source, formula.notModeled ?? ["a value it lacks"])
		return
	}
	deal(sim, { source, type: formula.type, raw })
}

function dealGrantNow(sim: Simulation, grant: Grant, effect: BuildEffect) {
	if (grant.kind !== "abilityDamage") return
	dealAbilityDamage(sim, grant.ability, grant.name, {
		kind: "effect",
		effectId: effect.id,
	})
}

/** An amount of the effect now, reading the attacker's stats when it needs them (Harrier's cooldown). */
function amountNow(sim: Simulation, amount: Amount, effect: BuildEffect) {
	return resolveAmount(amount, effect, {
		...sim.context,
		totals: statsNow(sim),
	})
}

function startCooldown(sim: Simulation, effect: BuildEffect) {
	const { cooldown } = effect.effect
	const seconds =
		cooldown === undefined ? undefined : amountNow(sim, cooldown, effect)
	if (seconds !== undefined) {
		sim.effectsReadyAt.set(effect.id, sim.time + seconds)
		sim.assumedCooldowns.delete(effect.id)
	}
}

function damageOverTimeGrants({ effect }: BuildEffect): DamageOverTimeGrant[] {
	return effect.grants.flatMap((grant) =>
		grant.kind === "damageOverTime" ? [grant] : [],
	)
}

/** One tick's raw damage for one stack, the target's health read now; undefined when a value is missing. */
function tickDamage(
	sim: Simulation,
	instance: Instance,
	{ tick: damage }: DamageOverTimeGrant,
): { type: DamageType; raw: number } | undefined {
	const target = { maximum: sim.input.target.health, current: sim.health }
	switch (damage.by) {
		case "amount": {
			const raw = resolveAmount(damage.amount, instance.effect, sim.context)
			return raw === undefined ? undefined : { type: damage.damageType, raw }
		}
		case "targetHealth":
			return {
				type: damage.damageType,
				raw: damage.ratio * targetHealth(damage.health, target),
			}
		case "abilityDamage": {
			const formula = abilityFormula(sim, damage.ability, damage.name)
			if (!formula) return undefined
			const { ranks, level } = sim.input.build
			const { ability } = damage
			const raw = evaluateDamage(formula, {
				stats: instance.stats ?? statsNow(sim),
				level,
				...(ability !== "passive" && { rank: ranks?.[ability] }),
				target,
			})
			return raw === undefined
				? undefined
				: { type: formula.type, raw: raw * damage.scale }
		}
	}
}

/** Up to `missingHealthBonus` more as the target's missing health grows (Tormented Shadow). */
function missingHealthFactor(sim: Simulation, grant: DamageOverTimeGrant) {
	const missing = 1 - sim.health / sim.input.target.health
	return 1 + (grant.missingHealthBonus ?? 0) * missing
}

/** One tick of each damage over time grant, one tick's damage per stack, owned by the application covering it. */
function tick(sim: Simulation, instance: Instance) {
	const grants = damageOverTimeGrants(instance.effect)
	const [timing] = grants
	if (!timing) return
	const owner =
		tickOwner(instance.applications, sim.time, timing)?.owner ?? sim.step
	const previous = sim.owner
	sim.owner = owner
	const source = { kind: "effect", effectId: instance.effect.id } as const
	for (const grant of grants) {
		const damage = tickDamage(sim, instance, grant)
		if (!damage) {
			notModeledHit(sim, source, ["a value it lacks"], { owner })
			continue
		}
		const raw = damage.raw * instance.stacks * missingHealthFactor(sim, grant)
		deal(sim, { source, type: damage.type, raw, tick: { owner } })
	}
	sim.owner = previous
	instance.ticks++
}

function nextTickAt(instance: Instance): number | undefined {
	const [timing] = damageOverTimeGrants(instance.effect)
	if (!timing) return undefined
	const at = tickTime(instance.startedAt, instance.ticks, timing)
	return coversTick(at, instance, timing) ? at : undefined
}

/** Free mode's choice for a damage over time the step `owner` applies; undefined follows the rules. */
function damageOverTimeChoice(
	sim: Simulation,
	owner: number,
	effectId: string,
): boolean | undefined {
	const id = outcomeId({ kind: "damage-over-time", effectId })
	return sim.input.free?.outcomes?.[owner]?.[id]
}

/** Records an application, which owns the ticks no earlier one covers; one per step and moment. */
function recordApplication(
	sim: Simulation,
	instance: Instance,
	{ owner, kind }: Pick<DamageOverTimeApplication, "owner" | "kind">,
	{ landing = false }: Pick<TriggerOptions, "landing"> = {},
) {
	instance.stats = statsNow(sim)
	const last = instance.applications.at(-1)
	if (last?.owner === owner && last.at === sim.time) {
		last.endsAt = instance.endsAt
		last.lastTickAt = instance.lastTickAt
		last.stacks = instance.stacks
		return
	}
	const application: DamageOverTimeApplication = {
		effectId: instance.effect.id,
		owner,
		at: sim.time,
		endsAt: instance.endsAt,
		kind,
		stacks: instance.stacks,
		...(instance.lastTickAt !== undefined && {
			lastTickAt: instance.lastTickAt,
		}),
	}
	const delay = instance.effect.effect.delay
	if (landing && delay) application.delayed = delay.label
	instance.applications.push(application)
	sim.applications.push(application)
}

type TriggerOptions = {
	/** Free mode's choice makes it happen whatever its cooldown. */
	ignoreCooldown?: boolean
	/** Its `delay` is over: it takes effect now. */
	landing?: boolean
	/** Its `startsAfter` state is over: it runs now. */
	released?: boolean
	/** How long it runs instead of its own duration: the time in its cast's area (a variant's). */
	duration?: number
}

/** The last tick a time in an area allows, from now (`ticksInArea`); none without one or a tick. */
function areaLastTickAt(
	sim: Simulation,
	effect: BuildEffect,
	inArea: number | undefined,
): number | undefined {
	const [timing] = damageOverTimeGrants(effect)
	if (inArea === undefined || !timing) return undefined
	const own = effectDuration(effect, sim.context) ?? inArea
	const ticks = ticksInArea(inArea, own, timing)
	return ticks
		? tickTime(sim.time, ticks - 1, timing)
		: Number.NEGATIVE_INFINITY
}

/**
 * Starts an effect whose trigger matched: its mark waits for the hit, an `abilityDamage` lands
 * now (or when an on-hit spends it), and one with a duration runs (or refreshes, one more stack).
 * Its cooldown gates it.
 */
function trigger(
	sim: Simulation,
	effect: BuildEffect,
	pending: PendingMarks,
	{
		ignoreCooldown = false,
		landing = false,
		released = false,
		...options
	}: TriggerOptions = {},
) {
	if (!isInForm(effect, sim.formId)) return
	const readyAt = sim.effectsReadyAt.get(effect.id) ?? 0
	if (readyAt > sim.time && !ignoreCooldown) return
	const { applies, endsOn, stacks, cooldownFrom, delay, startsAfter } =
		effect.effect
	if (delay && !landing) {
		const owner = sim.owner ?? sim.step
		sim.delayed.push({
			at: sim.time + delay.seconds,
			effect,
			owner,
			duration: options.duration,
		})
		return
	}
	if (startsAfter && !released) {
		startWaiting(sim, effect, startsAfter.duration)
		return
	}
	if (applies) pending.push({ ...applies, by: effect })
	if (!isEndedBy(effect, "on-hit")) {
		for (const grant of effect.effect.grants) dealGrantNow(sim, grant, effect)
	}
	if (!endsOn && !cooldownFrom) startCooldown(sim, effect)

	const duration = options.duration ?? effectDuration(effect, sim.context)
	if (!duration) return
	const dot = dealsDamageOverTime(effect)
	const owner = sim.owner ?? sim.step
	if (dot && damageOverTimeChoice(sim, owner, effect.id) === false) return
	const running = sim.active.find(
		(instance) => instance.effect.id === effect.id,
	)
	if (running) {
		const before = running.stacks
		running.triggeredAt = sim.time
		running.endsAt = sim.time + duration
		running.lastTickAt = areaLastTickAt(sim, effect, options.duration)
		running.stacks = Math.min(stacks?.max ?? 1, running.stacks + 1)
		if (running.charges) running.charges.used = 0
		if (dot) {
			const kind = running.stacks > before ? "stacked" : "refreshed"
			recordApplication(sim, running, { owner, kind }, { landing })
		}
		return
	}
	const instance = newInstance(sim, effect, duration)
	const lastTickAt = areaLastTickAt(sim, effect, options.duration)
	if (lastTickAt !== undefined) instance.lastTickAt = lastTickAt
	sim.active.push(instance)
	if (!dot) return
	recordApplication(sim, instance, { owner, kind: "applied" }, { landing })
	if (nextTickAt(instance) === sim.time) tick(sim, instance)
}

/** A delayed effect takes effect, for the step that triggered it (Noxious Trap detonating). */
function land(sim: Simulation, delayed: Delayed) {
	sim.delayed = sim.delayed.filter((entry) => entry !== delayed)
	const pending: PendingMarks = []
	const previous = sim.owner
	sim.owner = delayed.owner
	trigger(sim, delayed.effect, pending, {
		ignoreCooldown: true,
		landing: true,
		duration: delayed.duration,
	})
	sim.owner = previous
	applyMarks(sim, pending)
}

/** It waits in its `startsAfter` state from now, a re-trigger starting it over (Ambush camouflaged). */
function startWaiting(sim: Simulation, effect: BuildEffect, duration: Amount) {
	const owner = sim.owner ?? sim.step
	const until = sim.time + (amountNow(sim, duration, effect) ?? 0)
	sim.waiting = [
		...sim.waiting.filter((waiting) => waiting.effect !== effect),
		{ until, effect, owner },
	]
}

/** Its `startsAfter` state is over, broken or run out: it runs now, for the step that triggered it. */
function release(sim: Simulation, waiting: Waiting) {
	sim.waiting = sim.waiting.filter((entry) => entry !== waiting)
	const pending: PendingMarks = []
	const previous = sim.owner
	sim.owner = waiting.owner
	trigger(sim, waiting.effect, pending, {
		ignoreCooldown: true,
		landing: true,
		released: true,
	})
	sim.owner = previous
	applyMarks(sim, pending)
}

/** Breaks the states that `event` ends (an attack breaks Ambush's camouflage as it starts). */
function breakWaiting(sim: Simulation, event: BreakEvent) {
	for (const waiting of sim.waiting) {
		const { startsAfter } = waiting.effect.effect
		if (isCoveredBy(startsAfter?.endsOn, event)) release(sim, waiting)
	}
}

type TriggerWhereOptions = {
	/** Each matched effect's trigger options (a cast's time in its area for its own effects). */
	optionsFor?: (effect: BuildEffect) => TriggerOptions
}

function triggerWhere(
	sim: Simulation,
	matches: (trigger: Trigger, effect: BuildEffect) => boolean,
	pending: PendingMarks,
	{ optionsFor }: TriggerWhereOptions = {},
) {
	for (const effect of sim.input.effects) {
		if (matches(effect.effect.trigger, effect)) {
			trigger(sim, effect, pending, optionsFor?.(effect))
		}
	}
}

function expire(sim: Simulation, instance: Instance) {
	sim.active = sim.active.filter((running) => running !== instance)
	sim.log.push({
		kind: "expire",
		time: sim.time,
		effectId: instance.effect.id,
		holder: instance.holder,
	})
}

/** Ends a running effect; one whose cooldown runs from its end (`cooldownFrom: "end"`) starts it now. */
function end(sim: Simulation, instance: Instance) {
	expire(sim, instance)
	if (instance.effect.effect.cooldownFrom === "end") {
		startCooldown(sim, instance.effect)
	}
}

/** What just happened that may end an effect early; an ability cast says its slot. */
type EndEvent =
	| Exclude<EndsOn, "cast" | SlotCast>
	| { kind: "cast"; slot: AbilitySlot }

/** What may break a state an effect waits in (`startsAfter`). */
type BreakEvent = Exclude<EndEvent, "damage-taken" | "on-hit">

/** Whether `endsOn` (one reason or a list) covers `event`: "cast" any ability, a `SlotCast` its slots. */
function isCoveredBy(
	endsOn: EndsOn | readonly EndsOn[] | undefined,
	event: EndEvent,
): boolean {
	return [endsOn ?? []]
		.flat()
		.some((reason) =>
			typeof event === "string"
				? reason === event
				: reason === "cast" ||
					(typeof reason === "object" && reason.slots.includes(event.slot)),
		)
}

/** Whether `event` ends the effect early (its `endsOn`). */
function isEndedBy({ effect }: BuildEffect, event: EndEvent): boolean {
	return isCoveredBy(effect.endsOn, event)
}

/** Ends the attacker's effects that stop on `event`; their cooldown starts now. */
function endEffects(sim: Simulation, event: EndEvent) {
	for (const instance of sim.active.filter(
		({ effect, holder }) => holder === "attacker" && isEndedBy(effect, event),
	)) {
		expire(sim, instance)
		startCooldown(sim, instance.effect)
	}
}

function isPausedNow(sim: Simulation, { pausedUntil }: Instance) {
	return pausedUntil !== undefined && pausedUntil > sim.time
}

/** Pauses part of the attacker's effects that pause on `reason`, for their `seconds` from now. */
function pauseEffects(sim: Simulation, reason: PauseOn) {
	for (const instance of sim.active) {
		const { pauses } = instance.effect.effect
		if (instance.holder === "attacker" && pauses?.on.includes(reason)) {
			instance.pausedUntil = sim.time + pauses.seconds
		}
	}
}

function effectSource(instance: Instance): DamageSource {
	return {
		kind: "effect",
		effectId: instance.effect.id,
		...(instance.fromSituation && { fromSituation: instance.fromSituation }),
	}
}

function ratioDamage(
	{
		baseAttackDamage = 0,
		bonusAttackDamage = 0,
		abilityPower = 0,
	}: DamageRatios,
	stats: ComputedStats,
) {
	return (
		baseAttackDamage * stats.attackDamage.base +
		bonusAttackDamage * stats.attackDamage.bonus +
		abilityPower * stats.abilityPower.total
	)
}

/** On-hit: the on-hit effects trigger, then each primed effect spent by an on-hit (a spellblade) deals its damage. */
function onHit(sim: Simulation, pending: PendingMarks) {
	sim.log.push({ kind: "on-hit", time: sim.time })
	triggerWhere(sim, ({ kind }) => kind === "on-hit", pending)
	const spent = sim.active.filter(
		({ effect, holder }) =>
			holder === "attacker" && isEndedBy(effect, "on-hit"),
	)
	for (const instance of spent) {
		const stats = statsNow(sim)
		const source = effectSource(instance)
		for (const grant of instance.effect.effect.grants) {
			if (grant.kind === "abilityDamage") {
				dealAbilityDamage(sim, grant.ability, grant.name, source)
			}
			if (grant.kind !== "damage") continue
			deal(sim, {
				source,
				type: grant.damageType,
				raw: ratioDamage(grant.ratios, stats),
			})
		}
		expire(sim, instance)
		startCooldown(sim, instance.effect)
	}
}

/** Each running effect's `onAttackDamage`, dealt by a basic attack (Hail of Blades' true damage). */
function dealOnAttackDamage(sim: Simulation) {
	for (const instance of sim.active) {
		if (instance.holder !== "attacker") continue
		for (const grant of instance.effect.effect.grants) {
			if (grant.kind !== "onAttackDamage") continue
			const base =
				grant.base === undefined
					? 0
					: resolveAmount(grant.base, instance.effect, sim.context)
			const source = effectSource(instance)
			if (base === undefined) {
				notModeledHit(sim, source, ["a value it lacks"])
				continue
			}
			deal(sim, {
				source,
				type: grant.damageType,
				raw: base + ratioDamage(grant.ratios, statsNow(sim)),
			})
		}
	}
}

/** Free mode's choice for an outcome of the action running; undefined follows the rules. */
function choice(sim: Simulation, key: OutcomeKey): boolean | undefined {
	return sim.forced?.[outcomeId(key)]
}

/**
 * The attack's `on-attack` effects: a running one uses a charge and lasts longer (Hail of Blades
 * 2/3), a ready one triggers with this attack as its first. Free mode's choice overrides both;
 * returns the running ones it holds out of this attack.
 */
function empowerAttack(sim: Simulation, pending: PendingMarks): Instance[] {
	const held: Instance[] = []
	for (const effect of sim.input.effects) {
		if (effect.effect.trigger.kind !== "on-attack") continue
		if (!isInForm(effect, sim.formId)) continue
		const chosen = choice(sim, { kind: "empowered", effectId: effect.id })
		const find = () => sim.active.find((instance) => instance.effect === effect)
		const running = find()
		if (chosen === false) {
			if (running) held.push(running)
			sim.active = sim.active.filter((instance) => instance !== running)
			sim.empowered.set(effect.id, { happened: false })
			continue
		}
		if (!running) {
			const readyAt = sim.effectsReadyAt.get(effect.id) ?? 0
			if (readyAt > sim.time && !chosen) {
				sim.empowered.set(effect.id, { happened: false, readyAt })
				continue
			}
			trigger(sim, effect, pending, { ignoreCooldown: true })
		}
		const instance = find()
		const duration = effectDuration(effect, sim.context)
		if (instance && duration !== undefined) {
			instance.endsAt = sim.time + duration
		}
		if (instance?.charges) instance.charges.used++
		sim.empowered.set(effect.id, {
			happened: !!instance,
			...(instance?.charges && { charge: { ...instance.charges } }),
		})
	}
	return held
}

/** The attack uses a charge of each running effect an `on-attack` trigger doesn't count (Bladework, Monk Training). */
function spendCharges(sim: Simulation) {
	for (const { charges, effect, holder } of sim.active) {
		if (holder !== "attacker" || !charges) continue
		if (effect.effect.trigger.kind !== "on-attack") charges.used++
	}
}

/** Effects whose charges this attack used up end now (Hail of Blades after its third attack). */
function endSpentCharges(sim: Simulation) {
	for (const instance of sim.active.filter(
		({ charges }) => charges && charges.used >= charges.max,
	)) {
		end(sim, instance)
	}
}

/** A mark leaving the target (consumed, expired or overwritten): its applier's cooldown may start now. */
function markLeft(sim: Simulation, { mark, by }: Mark) {
	sim.markClearedAt.set(mark, sim.time)
	if (by.effect.cooldownFrom === "mark-end") startCooldown(sim, by)
}

/** The marks free mode consumes though they aren't on the target, as their applier would put them. */
function chosenMarks(sim: Simulation, by: MarkConsumer): Mark[] {
	const marks = new Map<string, Mark>()
	for (const effect of sim.input.effects) {
		const { applies } = effect.effect
		if (!applies?.consumedBy.includes(by) || marks.has(applies.mark)) continue
		if (!isInForm(effect, sim.formId)) continue
		const onTarget = sim.marks.some(({ mark }) => mark === applies.mark)
		if (
			!onTarget &&
			choice(sim, { kind: "mark-consumed", mark: applies.mark })
		) {
			marks.set(applies.mark, { ...applies, by: effect, endsAt: sim.time })
		}
	}
	return [...marks.values()]
}

function consumeMarks(
	sim: Simulation,
	by: MarkConsumer,
	pending: PendingMarks,
) {
	const consumed = sim.marks.filter(
		({ consumedBy, mark }) =>
			consumedBy.includes(by) &&
			choice(sim, { kind: "mark-consumed", mark }) !== false,
	)
	const chosen = chosenMarks(sim, by)
	sim.marks = sim.marks.filter((mark) => !consumed.includes(mark))
	for (const consumedMark of [...consumed, ...chosen]) {
		const { mark, fromSituation } = consumedMark
		sim.log.push({
			kind: "mark-consumed",
			time: sim.time,
			mark,
			...(fromSituation && { fromSituation }),
		})
		markLeft(sim, consumedMark)
		triggerWhere(
			sim,
			(trigger) => trigger.kind === "on-mark-consumed" && trigger.mark === mark,
			pending,
		)
	}
}

/** Free mode's choices for the marks the action applies: one prevented, or one its applier adds. */
function chooseMarks(
	sim: Simulation,
	pending: PendingMarks,
	item: CombatItem,
): PendingMarks {
	if (!sim.forced) return pending
	const kept = pending.filter(
		({ mark }) => choice(sim, { kind: "mark-applied", mark }) !== false,
	)
	for (const key of outcomeKeys(item, sim.input.effects, sim.formId)) {
		if (key.kind !== "mark-applied" || !choice(sim, key)) continue
		if (kept.some(({ mark }) => mark === key.mark)) continue
		const by = sim.input.effects.find(
			({ effect }) => effect.applies?.mark === key.mark,
		)
		if (by?.effect.applies) kept.push({ ...by.effect.applies, by })
	}
	return kept
}

function applyMarks(sim: Simulation, pending: PendingMarks) {
	for (const application of pending) {
		const endsAt = sim.time + application.duration
		const overwritten = sim.marks.filter(
			({ mark }) => mark === application.mark,
		)
		sim.marks = [
			...sim.marks.filter((mark) => !overwritten.includes(mark)),
			{ ...application, endsAt },
		]
		for (const mark of overwritten) markLeft(sim, mark)
		sim.log.push({
			kind: "mark-applied",
			time: sim.time,
			mark: application.mark,
			endsAt,
		})
	}
}

/**
 * When a periodic effect triggers next: once its cooldown is over and its mark has been off the
 * target for `idle` seconds; never while it runs or its mark is on the target.
 */
function periodicAt(sim: Simulation, effect: BuildEffect): number | undefined {
	const { trigger, applies, duration } = effect.effect
	if (trigger.kind !== "periodic" || !isInForm(effect, sim.formId)) {
		return undefined
	}
	// Without a mark or a duration, nothing would stop it from triggering again at once.
	if (!applies && duration === undefined) return undefined
	if (sim.active.some((instance) => instance.effect.id === effect.id)) {
		return undefined
	}
	if (applies && sim.marks.some(({ mark }) => mark === applies.mark)) {
		return undefined
	}
	const clearedAt = applies && sim.markClearedAt.get(applies.mark)
	return Math.max(
		sim.time,
		sim.effectsReadyAt.get(effect.id) ?? 0,
		clearedAt === undefined ? 0 : clearedAt + (trigger.idle ?? 0),
	)
}

function triggerPeriodic(sim: Simulation, effect: BuildEffect) {
	const pending: PendingMarks = []
	trigger(sim, effect, pending)
	applyMarks(sim, pending)
}

type AdvanceOptions = {
	/** Periodic effects trigger on the way (true); the tail after the last action only runs out what is running. */
	periodic?: boolean
}

/** What happens next on its own before `until`: a delayed effect, a tick, an effect or a mark running out, a periodic effect. */
function nextTimedEvent(
	sim: Simulation,
	until: number,
	{ periodic = true }: AdvanceOptions = {},
) {
	let next: { at: number; run: () => void } | undefined
	const consider = (at: number | undefined, run: () => void) => {
		if (at !== undefined && at <= until && (!next || at < next.at)) {
			next = { at, run }
		}
	}
	for (const delayed of sim.delayed) {
		consider(delayed.at, () => land(sim, delayed))
	}
	for (const waiting of sim.waiting) {
		consider(waiting.until, () => release(sim, waiting))
	}
	for (const instance of sim.active) {
		consider(nextTickAt(instance), () => tick(sim, instance))
		if (Number.isFinite(instance.endsAt)) {
			consider(instance.endsAt, () => end(sim, instance))
		}
	}
	for (const mark of sim.marks) {
		consider(mark.endsAt, () => {
			sim.marks = sim.marks.filter((running) => running !== mark)
			sim.log.push({ kind: "expire", time: sim.time, mark: mark.mark })
			markLeft(sim, mark)
		})
	}
	if (periodic) {
		for (const effect of sim.input.effects) {
			consider(periodicAt(sim, effect), () => triggerPeriodic(sim, effect))
		}
	}
	return next
}

/** Moves the clock to `until`, running every tick, expiry and periodic effect on the way, in time order. */
function advance(sim: Simulation, until: number, options?: AdvanceOptions) {
	for (
		let next = nextTimedEvent(sim, until, options);
		next;
		next = nextTimedEvent(sim, until, options)
	) {
		sim.time = Math.max(sim.time, next.at)
		next.run()
	}
	if (Number.isFinite(until)) sim.time = Math.max(sim.time, until)
}

/**
 * A basic attack: waits for the attack timer, starts its on-attack effects, hits, applies on-hit,
 * consumes marks; the next one is 1 / attack speed later.
 */
function attack(sim: Simulation, item: CombatItem) {
	advance(sim, Math.max(sim.time, sim.nextAttackAt))
	sim.actionStart = sim.log.length
	const pending: PendingMarks = []
	endEffects(sim, "attack")
	pauseEffects(sim, "attack")
	breakWaiting(sim, "attack")
	const held = empowerAttack(sim, pending)
	spendCharges(sim)
	deal(sim, {
		source: { kind: "attack" },
		type: "physical",
		raw: statsNow(sim).attackDamage.total,
	})
	dealOnAttackDamage(sim)
	onHit(sim, pending)
	consumeMarks(sim, "attack", pending)
	applyMarks(sim, chooseMarks(sim, pending, item))
	sim.nextAttackAt = sim.time + 1 / statsNow(sim).attackSpeed.total
	sim.busyUntil = sim.nextAttackAt
	sim.active.push(...held)
	endSpentCharges(sim)
}

function round(seconds: number) {
	return Math.round(seconds * 100) / 100
}

function hitRule(sim: Simulation, slot: AbilitySlot) {
	const { champion, patch } = sim.input.build
	return findHitRule(sim.hitRules, {
		championKey: champion.key,
		patch,
		slot,
	})
}

function damageNames(damage: string | readonly string[] | null) {
	if (damage === null) return []
	return typeof damage === "string" ? [damage] : damage
}

/** The variant a cast picked, the first by default; none when its rule has no variants. */
function chosenVariant(
	rule: AbilityHitRule | undefined,
	variant: string | undefined,
): AbilityVariant | undefined {
	const variants = rule?.variants ?? []
	return variants.find(({ id }) => id === variant) ?? variants[0]
}

/**
 * The tooltip damages a cast deals: its chosen variant's (the first by default), its rule's (one,
 * several or none), else the tooltip's first.
 */
function castDamages(
	spell: ChampionSpell,
	rule: AbilityHitRule | undefined,
	variant: string | undefined,
): readonly string[] {
	const damage = chosenVariant(rule, variant)?.damage
	if (damage !== undefined) return damageNames(damage)
	if (rule?.damage === undefined) {
		const first = spell.damage?.[0]?.name
		return first ? [first] : []
	}
	return damageNames(rule.damage)
}

/** The cast's hits, one per damage it deals; it may apply on-hit, and it consumes the marks abilities do. */
function abilityHit(
	sim: Simulation,
	spell: ChampionSpell,
	pending: PendingMarks,
	variant: string | undefined,
) {
	const rule = hitRule(sim, spell.slot)
	const names = castDamages(spell, rule, variant)
	if (rule?.notModeled) {
		notModeledHit(
			sim,
			{
				kind: "ability",
				slot: spell.slot,
				name: names[0] ?? spell.damage?.[0]?.name ?? spell.name,
			},
			[rule.notModeled],
		)
	} else {
		// The cast's damages are one hit: a share of health reads it before any of them lands.
		const targetHealth = sim.health
		for (const name of names) {
			const source = { kind: "ability", slot: spell.slot, name } as const
			dealAbilityDamage(sim, spell.slot, name, source, { targetHealth })
		}
	}
	if (rule?.onHit) onHit(sim, pending)
	consumeMarks(sim, "ability", pending)
}

/** Why an ability can't be cast now; undefined when it can. Free mode ignores its cooldown. */
function abilityRefusal(
	sim: Simulation,
	spell: ChampionSpell,
	rank: number,
): string | undefined {
	if (rank < 1) return `${spell.name} has no point yet`
	if (spell.unavailable) return spell.unavailable.reason
	const noCast = hitRule(sim, spell.slot)?.noCast
	if (noCast) return noCast
	const readyAt = sim.cooldowns.get(spell.slot) ?? 0
	if (readyAt > sim.time && !sim.free) {
		return `${spell.name} is on cooldown until ${round(readyAt)} s`
	}
	return undefined
}

/** Every effect with `reducedOnCast` gets that much closer to ready (Short Fuse, at the cast's start). */
function reduceCooldownsOnCast(sim: Simulation) {
	for (const effect of sim.input.effects) {
		const { reducedOnCast } = effect.effect
		const readyAt = sim.effectsReadyAt.get(effect.id)
		if (reducedOnCast === undefined || readyAt === undefined) continue
		const seconds = amountNow(sim, reducedOnCast, effect) ?? 0
		sim.effectsReadyAt.set(effect.id, Math.max(sim.time, readyAt - seconds))
	}
}

function castAbility(
	sim: Simulation,
	action: Extract<CombatAction, { kind: "ability" }>,
): string | undefined {
	const { slot } = action
	const spell = sim.spells.find((ability) => ability.slot === slot)
	const rank = sim.input.build.ranks?.[slot] ?? 0
	if (!spell) return `No ability in ${slot}`
	const refusal = abilityRefusal(sim, spell, rank)
	if (refusal) return refusal

	const pending: PendingMarks = []
	sim.log.push({
		kind: "cast",
		time: sim.time,
		source: { kind: "ability", slot },
	})
	reduceCooldownsOnCast(sim)
	const cast = { kind: "cast", slot } as const
	endEffects(sim, cast)
	pauseEffects(sim, "cast")
	breakWaiting(sim, cast)
	const areaTime = chosenVariant(hitRule(sim, slot), action.variant)?.duration
	triggerWhere(
		sim,
		(trigger, effect) =>
			trigger.kind === "after-ability" ||
			(trigger.kind === "on-cast" && (trigger.slots?.includes(slot) ?? true)) ||
			isCastOwnEffect(effect, slot),
		pending,
		{
			optionsFor: (effect) =>
				isCastOwnEffect(effect, slot) ? { duration: areaTime } : {},
		},
	)
	abilityHit(sim, spell, pending, action.variant)
	applyMarks(sim, chooseMarks(sim, pending, action))
	const cooldown = spell.cooldown[rank - 1] ?? 0
	sim.cooldowns.set(
		slot,
		sim.time + abilityCooldown(cooldown, statsNow(sim).abilityHaste.total),
	)
	sim.busyUntil = sim.time + (spell.castTime ?? 0)
	return undefined
}

function castSummoner(sim: Simulation, slot: SummonerSlot): string | undefined {
	const spell = sim.input.summoners[slot]
	if (!spell) return "No summoner spell in this slot"
	const key = `summoner-${slot}`
	const readyAt = sim.cooldowns.get(key) ?? 0
	if (readyAt > sim.time && !sim.free) {
		return `${spell.name} is on cooldown until ${round(readyAt)} s`
	}
	const pending: PendingMarks = []
	sim.log.push({
		kind: "cast",
		time: sim.time,
		source: { kind: "summoner", slot, spellKey: spell.key },
	})
	triggerWhere(
		sim,
		(trigger, effect) =>
			(trigger.kind === "after-use" &&
				effect.effect.source.kind === "summoner" &&
				effect.effect.source.spellKey === spell.key) ||
			(trigger.kind === "after-summoner" && effect.spell?.key === spell.key),
		pending,
	)
	applyMarks(sim, pending)
	sim.cooldowns.set(key, sim.time + spellCooldown(spell))
	return undefined
}

/** Runs one action; returns why it was refused, if it was. */
function run(sim: Simulation, action: CombatAction): string | undefined {
	sim.actionStart = sim.log.length
	sim.empowered.clear()
	switch (action.kind) {
		case "attack":
			attack(sim, action)
			return undefined
		case "ability":
			return castAbility(sim, action)
		case "summoner":
			return castSummoner(sim, action.slot)
		case "wait":
			if (!(action.seconds > 0)) return "A wait needs a positive time"
			advance(sim, sim.time + action.seconds)
			return undefined
	}
}

/** The outcomes the action could have, and which happened while it ran. */
function stepOutcomes(
	sim: Simulation,
	action: CombatAction,
	refused: string | undefined,
): StepOutcome[] {
	const events = sim.log.slice(sim.actionStart)
	const happened = (key: OutcomeKey): Empowered => {
		if (refused) return { happened: false }
		switch (key.kind) {
			case "empowered":
				return sim.empowered.get(key.effectId) ?? { happened: false }
			case "mark-applied":
			case "mark-consumed":
				return {
					happened: events.some(
						(event) => event.kind === key.kind && event.mark === key.mark,
					),
				}
			// Its ticks may still apply it after the action (`settleDamageOverTime`).
			case "damage-over-time":
				return { happened: false }
		}
	}
	return outcomeKeys(action, sim.input.effects, sim.formId).map((key) => ({
		...key,
		...happened(key),
	}))
}

/**
 * Free mode's "yes" for a damage over time the action's rules didn't apply: it applies now. Not
 * when one the step applied will trigger it with its ticks (Liandry's from Tormented Shadow).
 */
function forceChosenDamageOverTime(
	sim: Simulation,
	item: CombatAction,
	index: number,
) {
	const chosen = sim.input.free?.outcomes?.[index]
	if (!chosen) return
	// A delayed one the step triggered counts as applied: it takes effect later.
	const own = [
		...sim.applications,
		...sim.delayed.map(({ effect, owner }) => ({ effectId: effect.id, owner })),
	].filter(({ owner }) => owner === index)
	const ticksAbilityDamage = own.some(({ effectId }) =>
		isAbilityDamage(sim, { kind: "effect", effectId }),
	)
	for (const key of outcomeKeys(item, sim.input.effects, sim.formId)) {
		if (key.kind !== "damage-over-time" || !chosen[outcomeId(key)]) continue
		if (own.some(({ effectId }) => effectId === key.effectId)) continue
		const effect = sim.input.effects.find(({ id }) => id === key.effectId)
		if (!effect) continue
		const byTicks = effect.effect.trigger.kind === "on-ability-damage"
		if (byTicks && ticksAbilityDamage) continue
		const pending: PendingMarks = []
		sim.owner = index
		trigger(sim, effect, pending, { ignoreCooldown: true })
		sim.owner = undefined
		applyMarks(sim, pending)
	}
}

/** Once every tick landed: each step's damage over time, and whether its outcomes happened. */
function settleDamageOverTime(sim: Simulation, steps: CombatStep[]) {
	const summaries = damageOverTimeSummaries(
		sim.applications,
		sim.log,
		steps.length,
	)
	for (const [index, step] of steps.entries()) {
		step.damageOverTime = summaries[index] ?? []
		step.outcomes = step.outcomes.map((outcome) =>
			outcome.kind === "damage-over-time"
				? {
						...outcome,
						happened:
							!step.refused &&
							step.damageOverTime.some(
								({ effectId }) => effectId === outcome.effectId,
							),
					}
				: outcome,
		)
	}
}

/** What a running effect has paused now, and until when. */
function pausedView(
	sim: Simulation,
	{ effect, pausedUntil }: Pick<Instance, "effect" | "pausedUntil">,
): Pick<ActiveEffect, "paused"> {
	const { pauses } = effect.effect
	if (!pauses || pausedUntil === undefined || pausedUntil <= sim.time) return {}
	return { paused: { until: pausedUntil, grants: pauses.grants } }
}

/** The effects in their `startsAfter` state now, and those whose `delay` leads into one. */
function waitingView(sim: Simulation): WaitingEffect[] {
	const delayed = sim.delayed.flatMap(({ at, effect }): WaitingEffect[] => {
		const { startsAfter } = effect.effect
		if (!startsAfter) return []
		const seconds = amountNow(sim, startsAfter.duration, effect) ?? 0
		const { label } = startsAfter
		return [{ effectId: effect.id, label, from: at, until: at + seconds }]
	})
	const waiting = sim.waiting.flatMap(({ effect, until }) => {
		const label = effect.effect.startsAfter?.label
		return label ? [{ effectId: effect.id, label, until }] : []
	})
	return [...delayed, ...waiting]
}

function snapshot(
	sim: Simulation,
): Pick<CombatStep, "active" | "waiting" | "marks"> {
	const waiting = waitingView(sim)
	return {
		active: sim.active
			.filter(({ effect }) => isInForm(effect, sim.formId))
			.map(
				({
					effect,
					holder,
					startedAt,
					endsAt,
					stacks,
					pausedUntil,
				}): ActiveEffect => ({
					effectId: effect.id,
					holder,
					startedAt,
					endsAt,
					stacks,
					...pausedView(sim, { effect, pausedUntil }),
				}),
			),
		...(waiting.length > 0 && { waiting }),
		marks: sim.marks.map(({ mark, endsAt }) => ({ mark, endsAt })),
	}
}

function totals(events: readonly CombatEvent[]) {
	const zero = (): DamageTotals => ({ raw: 0, final: 0 })
	const total = zero()
	const byType: Record<DamageType, DamageTotals> = {
		physical: zero(),
		magic: zero(),
		true: zero(),
	}
	for (const event of events) {
		if (event.kind !== "hit" || !("damage" in event)) continue
		const { type, raw, final } = event.damage
		for (const sum of [total, byType[type]]) {
			sum.raw += raw
			sum.final += final
		}
	}
	return { total, byType }
}

/**
 * Simulates a combo against a target that doesn't react: each action in order, with the stats of
 * the moment (`computeBuildStats` with the effects running then), the events it causes and the
 * damage after mitigation; each marker sets its situation from its place. Pure; see
 * docs/frontend-architecture.md, Combat.
 */
export function simulateCombat(
	input: CombatInput,
	{ hitRules = ABILITY_HIT_RULES }: SimulateCombatOptions = {},
): CombatResult {
	const sim = createSimulation(input, hitRules)
	const steps: CombatStep[] = []
	let logged = 0
	// An action owns what happens from it until the next action starts (a burn ticking on); markers own nothing.
	const closeStep = () => {
		const last = steps.findLast(({ action }) => action.kind !== "situation")
		last?.events.push(...sim.log.slice(logged))
		if (last) last.targetHealth = sim.health
		logged = sim.log.length
	}
	for (const [index, item] of input.actions.entries()) {
		// A marker sets its situation before anything else due at that moment (Valor marking at 0).
		if (item.kind === "situation") {
			steps.push({
				action: item,
				time: sim.time,
				situation: applySituation(sim, item.effectId),
				outcomes: [],
				events: [],
				damageOverTime: [],
				...snapshot(sim),
				targetHealth: sim.health,
			})
			continue
		}
		advance(sim, sim.time)
		closeStep()
		sim.step = index
		sim.forced = input.free?.outcomes?.[index]
		const startedAt = Math.max(
			sim.time,
			item.kind === "attack" ? sim.nextAttackAt : sim.time,
		)
		const refused = run(sim, item)
		if (!refused) forceChosenDamageOverTime(sim, item, index)
		steps.push({
			action: item,
			time: startedAt,
			...(refused && { refused }),
			outcomes: stepOutcomes(sim, item, refused),
			events: [],
			damageOverTime: [],
			...snapshot(sim),
			targetHealth: sim.health,
		})
		sim.forced = undefined
		advance(sim, sim.busyUntil)
	}
	// After the last action, only what runs plays out: a periodic effect would come back forever.
	advance(sim, Number.POSITIVE_INFINITY, { periodic: false })
	closeStep()
	settleDamageOverTime(sim, steps)
	const duration = sim.log.findLast(({ kind }) => kind === "hit")?.time ?? 0
	return {
		steps,
		...totals(sim.log),
		...(sim.kill && { kill: sim.kill }),
		duration,
		activeUntil: Math.max(duration, sim.log.at(-1)?.time ?? 0),
	}
}

/** Free mode's result, and the outcomes the user's choices start from (the computed ones, by item). */
export type FreeCombat = { result: CombatResult; seed: OutcomeChoices[] }

/**
 * Free mode: the combo with no cooldown refusing an action, its outcomes seeded from the rules'
 * result and set by `choices` (by item, `outcomeId`) wherever the user changed one. A choice for an
 * outcome the item can't have is ignored.
 */
export function simulateFreeCombat(
	input: CombatInput,
	choices: readonly (OutcomeChoices | undefined)[],
	options?: SimulateCombatOptions,
): FreeCombat {
	const computed = simulateCombat({ ...input, free: {} }, options)
	const seed = outcomeChoices(computed)
	const outcomes = seed.map((seeded, index) => {
		const chosen = choices[index] ?? {}
		return Object.fromEntries(
			Object.entries(seeded).map(([id, happened]) => [
				id,
				chosen[id] ?? happened,
			]),
		)
	})
	const changed = outcomes.some((entries, index) =>
		Object.entries(entries).some(([id, value]) => seed[index]?.[id] !== value),
	)
	return {
		result: changed
			? simulateCombat({ ...input, free: { outcomes } }, options)
			: computed,
		seed,
	}
}
