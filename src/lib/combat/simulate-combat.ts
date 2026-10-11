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
	CastInstance,
	DamageOverTimeGrant,
	DamageRatios,
	EffectDamage,
	EndsOn,
	Grant,
	MarkApplication,
	MarkConsumer,
	PauseOn,
	SlotCast,
	StackGain,
	StackReset,
	Trigger,
} from "../effects/effect"
import {
	abilityCounters,
	type EffectContext,
	effectDuration,
	isInForm,
	resolveAmount,
	resolveGrants,
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
import { attackWindupTime } from "./attack-windup"
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
	DelayedHit,
	EffectHolder,
	OutcomeChoices,
	OutcomeKey,
	SituationStatus,
	StepOutcome,
	TickOwner,
	WaitingEffect,
} from "./combat"
import type { StartStack } from "./combo-link"
import { abilityCooldown, evaluateDamage, targetHealth } from "./damage-formula"
import {
	coversTick,
	type DamageOverTimeApplication,
	damageOverTimeSummaries,
	tickOwner,
	ticksInArea,
	tickTime,
} from "./damage-over-time"
import { effectDamageType } from "./damage-type"
import { mitigate, type ResistReduction, reducedResists } from "./mitigation"
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
	type AttackSpeedHits,
	areaSeconds,
	type BlocksAttacks,
	defaultVariant,
	findHitRule,
	type LaterHits,
} from "./registries/ability-hits"
import { hasStartCooldown } from "./start-cooldowns"
import { isStartRunningEffect, isStartStackEffect } from "./start-state"

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
	/** The effects with a start cooldown (`hasStartCooldown`) that start on it; the others start ready. */
	startOnCooldown?: readonly string[]
	/** The stacking effects (`isStartStackEffect`) it starts with, at their count up to their cap (issue 317). */
	startStacks?: readonly StartStack[]
	/** The buffs (`isStartRunningEffect`) it starts with running, their abilities on cooldown (issue 317). */
	startRunning?: readonly string[]
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
	/** When the action running ends: an attack after its windup, an ability after its cast time. */
	busyUntil: number
	/** When the attack timer, started by an attack's windup, lets the next attack start. */
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
	/** Damage is triggering its `on-damage` effects now, so their own damage doesn't loop. */
	onDamage: boolean
	/** When damage last triggered each `on-damage` effect: once per moment. */
	damageTriggeredAt: Map<string, number>
	/** An action's damage is triggering its `on-action-damage` effects now, so their own damage doesn't loop. */
	onActionDamage: boolean
	/** When each action last triggered its `on-action-damage` effects, by "effect id@step" (and cast instance). */
	actionDamageTriggered: Map<string, number>
	/** While a hit's on-hit effects run: the target's health as the hit began, which they read (wiki BotRK). */
	hitHealth?: number
	/** While a hit's on-hit effects run: the effects at their most stacks before any triggered (`requiresMaxStacks`). */
	maxedAtHit?: ReadonlySet<string>
	/** Effects with a `delay` waiting to take effect, and the step that triggered each. */
	delayed: Delayed[]
	/** Effects in their `startsAfter` state, until an event breaks it or `until`. */
	waiting: Waiting[]
	/** Casts' hits still to land (`LaterHits`: Pyroclasm's bounces). */
	laterHits: LaterHit[]
	/** The step whose cast's later hit is landing now, which shows its hits. */
	laterHitOf?: number
	/** The effect whose own hit applies on-hit now (a phantom hit), which the on-hit damage names. */
	onHitOf?: string
	/** Each step's state once its cast's last later hit landed (Judgment's last spin), by item index. */
	afterLaterHits: Map<number, StepState>
	/** The recasts each ability has left (`Recasts`), until when, and when the next may start. */
	recasts: Map<AbilitySlot, RecastWindow>
	/** A cast that stops basic attacks while it runs (`BlocksAttacks`: Judgment), until when. */
	attackLock?: AttackLock
	/** Each step's cast hitting again and again (`attackSpeedHits`): its hits, and its full duration's. */
	castHits: Map<number, { count: number; of: number }>
}

type AttackLock = BlocksAttacks & { until: number }

/** A hit landing this close after a time in an area ends still counts: the one exactly then does. */
const AREA_EPSILON = 1e-9

/** A lockout ending this close before a hit is over: float time sums never land exactly on it. */
const TIME_EPSILON = 1e-9

type RecastWindow = { left: number; until: number; nextAt: number }

type Delayed = {
	at: number
	effect: BuildEffect
	owner: number
	duration?: number
}

type Waiting = { until: number; effect: BuildEffect; owner: number }

type LaterHit = {
	at: number
	spell: ChampionSpell
	variant: string | undefined
	owner: number
	/** The cast's own hit, landing at its cast time's end (`landsAtCastEnd`): its `on-cast` effects already triggered. */
	first?: true
}

/** Marks to put on the target once the action's hit is done (Vault deals its damage, then marks). */
type PendingMarks = PendingMark[]

/**
 * A periodic effect (Valor) starts the combo on its cooldown, as if just used, unless a marker before
 * the first action sets its situation. Any other cooldown starts ready unless `startOnCooldown` names it.
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
	const onCooldown = new Set(sim.input.startOnCooldown)
	for (const effect of sim.input.effects) {
		if (!isInForm(effect, sim.formId)) continue
		const periodic = effect.effect.trigger.kind === "periodic"
		const starts = periodic
			? !leading.has(effect.id)
			: hasStartCooldown(effect, sim.context.level) && onCooldown.has(effect.id)
		if (starts) {
			startCooldown(sim, effect)
			sim.assumedCooldowns.add(effect.id)
		}
	}
}

/**
 * The stacks and running buffs the combo starts with, each its full duration from 0 s (owner
 * decision 6a); a running ability buff starts its ability's cooldown as if just cast (5b).
 */
function startState(sim: Simulation) {
	const usable = (id: string) =>
		sim.input.effects.find(
			(effect) => effect.id === id && isInForm(effect, sim.formId),
		)
	for (const { id, count } of sim.input.startStacks ?? []) {
		const effect = usable(id)
		const max = effect?.effect.stacks?.max
		if (!effect || !max || !isStartStackEffect(effect.effect)) continue
		sim.active.push({
			...newInstance(sim, effect, effectDuration(effect, sim.context) ?? 0),
			stacks: Math.min(count, max),
		})
	}
	for (const id of sim.input.startRunning ?? []) {
		const effect = usable(id)
		if (!effect || !isStartRunningEffect(effect.effect)) continue
		sim.active.push(
			newInstance(sim, effect, effectDuration(effect, sim.context) ?? 0),
		)
	}
	for (const id of sim.input.startRunning ?? []) {
		const source = usable(id)?.effect.source
		if (source?.kind === "ability" && source.slot !== "passive") {
			startAbilityCooldown(sim, source.slot)
		}
	}
}

/** Puts the ability on its cooldown from now, read at the build's rank and ability haste. */
function startAbilityCooldown(sim: Simulation, slot: AbilitySlot) {
	const spell = sim.spells.find((ability) => ability.slot === slot)
	const rank = sim.input.build.ranks?.[slot] ?? 0
	if (!spell || rank < 1) return
	const haste = statsNow(sim).abilityHaste.total
	sim.cooldowns.set(
		slot,
		sim.time +
			abilityCooldown(spell.cooldown[rank - 1] ?? 0, haste) *
				cooldownMultiplier(sim, slot),
	)
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
			matchStacks: input.build.matchStacks,
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
		onDamage: false,
		damageTriggeredAt: new Map(),
		onActionDamage: false,
		actionDamageTriggered: new Map(),
		delayed: [],
		waiting: [],
		laterHits: [],
		afterLaterHits: new Map(),
		recasts: new Map(),
		castHits: new Map(),
	}
	startCooldowns(sim)
	startState(sim)
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
	/** Proc damage (wiki), which `notProc` effects ignore. */
	proc?: boolean
}

/** The reductions the effects on the target hold now, each at its stacks (Carve: 6% per stack). */
function targetReductions(sim: Simulation): ResistReduction[] {
	return sim.active
		.filter(({ holder }) => holder === "target")
		.flatMap(({ effect, stacks, triggeredAt }) =>
			resolveGrants(effect, {
				...sim.context,
				stacks: { [effect.id]: stacks },
				elapsed: { [effect.id]: sim.time - triggeredAt },
			}).flatMap((grant): ResistReduction[] =>
				grant.kind === "resistReduction"
					? [{ resist: grant.resist, mode: grant.mode, value: grant.value }]
					: [],
			),
		)
}

/**
 * Damage landing triggers the `on-damage` effects of its type, each once per moment (wiki Black
 * Cleaver: once per frame).
 */
function triggerOnDamage(sim: Simulation, type: DamageType) {
	if (sim.onDamage) return
	sim.onDamage = true
	const pending: PendingMarks = []
	for (const effect of sim.input.effects) {
		const { trigger: on } = effect.effect
		if (on.kind !== "on-damage" || on.damageType !== type) continue
		if (sim.damageTriggeredAt.get(effect.id) === sim.time) continue
		sim.damageTriggeredAt.set(effect.id, sim.time)
		trigger(sim, effect, pending)
	}
	applyMarks(sim, pending)
	sim.onDamage = false
}

/** A hit landing with a cast's later hit shows on that cast's step; a tick shows with its application. */
function laterHitOf(
	sim: Simulation,
	tick: TickOwner | undefined,
): { laterHit?: TickOwner } {
	const owner = sim.laterHitOf
	return owner === undefined || tick ? {} : { laterHit: { owner } }
}

/** On-hit damage an effect's own hit applied (a phantom hit), named on the hit. */
function onHitOf(sim: Simulation, tick: TickOwner | undefined) {
	return sim.onHitOf === undefined || tick
		? {}
		: { onHitOf: { effectId: sim.onHitOf } }
}

/** {@link DelayedHit}: dealt for an earlier step than the one running, other than as a tick or a later hit. */
function delayedOf(sim: Simulation, tick: TickOwner | undefined): DelayedHit {
	const { owner } = sim
	if (owner === undefined || owner === sim.step || tick) return {}
	return sim.laterHitOf === undefined ? { delayed: { owner } } : {}
}

function deal(sim: Simulation, { source, type, raw, tick, proc }: Damage) {
	// A basic attack doesn't read the reduction it applies; other damage does (wiki Black Cleaver).
	const ownFirst = source.kind !== "attack"
	if (ownFirst) triggerOnDamage(sim, type)
	const mitigated = mitigate(raw, type, {
		target: sim.input.target,
		attacker: statsNow(sim),
		reductions: targetReductions(sim),
	})
	const final = mitigated * damageAmplification(sim, source)
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
		...laterHitOf(sim, tick),
		...delayedOf(sim, tick),
		...onHitOf(sim, tick),
	})
	if (!ownFirst) triggerOnDamage(sim, type)
	triggerOnAbilityDamage(sim, source)
	triggerOnActionDamage(sim, source, { proc })
	dealBonusTrueDamage(sim, source, final)
}

/**
 * Each running effect's `bonusTrueDamage`: its share of a hit's damage after mitigation, the hit that
 * started it included (wiki First Strike); its own hits add none. Its missile's travel isn't counted.
 */
function dealBonusTrueDamage(
	sim: Simulation,
	source: DamageSource,
	final: number,
) {
	for (const instance of sim.active) {
		if (instance.holder !== "attacker") continue
		const { effect } = instance
		if (source.kind === "effect" && source.effectId === effect.id) continue
		for (const grant of effect.effect.grants) {
			if (grant.kind !== "bonusTrueDamage") continue
			const share = resolveAmount(grant.amount, effect, sim.context) ?? 0
			deal(sim, {
				source: effectSource(instance),
				type: "true",
				raw: share * final,
			})
		}
	}
}

/**
 * What the attacker's running effects multiply its damage by, after mitigation, each at its stacks
 * (Press the Attack's 8%; Spear of Shojin: 3% per stack on ability damage, not on the hit adding it).
 */
function damageAmplification(sim: Simulation, source: DamageSource): number {
	let amplification = 1
	for (const { effect, holder, stacks } of sim.active) {
		if (holder !== "attacker") continue
		const max = effect.effect.stacks?.max ?? 1
		for (const grant of effect.effect.grants) {
			if (grant.kind !== "damageAmplification") continue
			if (grant.abilitiesOnly && !isAbilityDamage(sim, source)) continue
			const amount = resolveAmount(grant.amount, effect, sim.context) ?? 0
			amplification += (amount * Math.min(stacks, max)) / max
		}
	}
	return amplification
}

/** The ability whose damage this is: its cast's, or that of an effect whose source is an ability. */
function damageAbility(
	sim: Simulation,
	source: DamageSource,
): AbilitySlot | "passive" | undefined {
	if (source.kind === "ability") return source.slot
	if (source.kind !== "effect") return undefined
	const effect = sim.input.effects.find(({ id }) => id === source.effectId)
	const origin = effect?.effect.source
	return origin?.kind === "ability" ? origin.slot : undefined
}

/**
 * An action's damage landing triggers the `on-action-damage` effects, once per action: its later
 * hits, ticks and delayed hits count as it (one stack per cast instance, wiki Electrocute), unless
 * its hit rule's `actionPerHit` names the effect. Its first damage says whether a basic attack
 * dealt it (`stacks.gain`). `abilitiesOnly`: a Q, W, E or R's damage, not the passive's. With
 * `castInstance`, once per action and ability whose damage it is (a detonated mark is its own ability's).
 * `notProc`: not by proc damage.
 */
function triggerOnActionDamage(
	sim: Simulation,
	source: DamageSource,
	{ proc = false }: ActionDamageOptions = {},
) {
	if (sim.onActionDamage) return
	sim.onActionDamage = true
	const action = sim.owner ?? sim.step
	const ability = damageAbility(sim, source)
	const pending: PendingMarks = []
	for (const effect of sim.input.effects) {
		const { trigger: on } = effect.effect
		if (on.kind !== "on-action-damage") continue
		if (on.abilitiesOnly && (!ability || ability === "passive")) continue
		if (on.notProc && proc) continue
		const hit = isActionPerHit(sim, source, effect.id) ? `@${sim.time}` : ""
		const instance = on.castInstance ? `:${ability ?? source.kind}` : ""
		const key = `${effect.id}@${action}${hit}${instance}`
		if (!isActionDamageReady(sim, key, on.castInstance)) continue
		const below = on.targetBelow ?? Number.POSITIVE_INFINITY
		if (sim.health >= below * sim.input.target.health) continue
		sim.actionDamageTriggered.set(key, sim.time)
		const by = source.kind === "attack" ? "attack" : "other"
		trigger(sim, effect, pending, { by })
	}
	applyMarks(sim, pending)
	sim.onActionDamage = false
}

type ActionDamageOptions = {
	/** The damage is proc damage (Savagery's bonus). */
	proc?: boolean
}

/** Not triggered by this action yet, or by its cast instance `lockout` seconds ago or more (Shock's 6.5 s). */
function isActionDamageReady(
	sim: Simulation,
	key: string,
	castInstance: CastInstance | undefined,
): boolean {
	const last = sim.actionDamageTriggered.get(key)
	if (last === undefined) return true
	return (
		!!castInstance && sim.time - last >= castInstance.lockout - TIME_EPSILON
	)
}

/** The cast's hit rule names the effect in `actionPerHit`: each of its hits, at its own time, is an action. */
function isActionPerHit(
	sim: Simulation,
	source: DamageSource,
	effectId: string,
): boolean {
	if (source.kind !== "ability" || source.slot === "passive") return false
	return !!hitRule(sim, source.slot)?.actionPerHit?.includes(effectId)
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
		...laterHitOf(sim, tick),
		...delayedOf(sim, tick),
		...onHitOf(sim, tick),
	})
	triggerOnAbilityDamage(sim, source)
	triggerOnActionDamage(sim, source)
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
	/** The formula counts the attack's total attack damage, which an empowered attack's own hit deals. */
	withoutAttack?: boolean
	/** Times the damage (`perTargetStack`); 1 by default. */
	scale?: number
	/** Proc damage (wiki): `procBonus`, or a grant's `proc`. */
	proc?: boolean
}

/** The counts the ability's formulas read from the attacker's running effects (Siphoning Strike's stacks). */
function countersNow(sim: Simulation, ability: AbilitySlot | "passive") {
	const running = sim.active
		.filter(({ holder }) => holder === "attacker")
		.map(({ effect }) => effect)
	return abilityCounters(running, sim.context, ability)
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
	{
		targetHealth = sim.health,
		withoutAttack = false,
		scale = 1,
		proc = false,
	}: AbilityDamageOptions = {},
) {
	const { ranks, level } = sim.input.build
	const formula = abilityFormula(sim, ability, name)
	if (!formula) {
		notModeledHit(sim, source, [`no synced damage named ${name}`])
		return
	}
	const stats = statsNow(sim)
	const total = evaluateDamage(formula, {
		stats,
		level,
		...(ability !== "passive" && { rank: ranks?.[ability] }),
		target: { maximum: sim.input.target.health, current: targetHealth },
		counters: countersNow(sim, ability),
	})
	if (total === undefined) {
		notModeledHit(sim, source, formula.notModeled ?? ["a value it lacks"])
		return
	}
	const attack = withoutAttack ? stats.attackDamage.total : 0
	const raw = Math.max(0, total - attack) * scale
	deal(sim, { source, type: formula.type, raw, proc })
}

/**
 * An effect's damage now: its base plus ratios of the attacker's stats and its share of the target's
 * health, which reads the health as the hit began (`hitHealth`), as does its missing health bonus;
 * its type read at the hit.
 */
function grantDamage(
	sim: Simulation,
	grant: EffectDamage,
	effect: BuildEffect,
): { type: DamageType; raw: number } | undefined {
	const { champion } = sim.input.build
	const stats = statsNow(sim)
	const parts = [grant.base ?? 0]
		.flat()
		.map((part) =>
			resolveAmount(part, effect, { ...sim.context, totals: stats }),
		)
	if (parts.some((part) => part === undefined)) return undefined
	const base = parts.reduce<number>((sum, part) => sum + (part ?? 0), 0)
	const type = effectDamageType(grant.damageType, {
		stats,
		ratios: grant.ratios,
		adaptiveType: champion.adaptiveType,
	})
	// Bonus attack speed as a share: the stat's bonus over the champion's ratio (wiki "Attack speed").
	const bonusAttackSpeed =
		stats.attackSpeed.bonus / champion.stats.attackSpeed.ratio
	const scale = 1 + (grant.perBonusAttackSpeed ?? 0) * bonusAttackSpeed
	const share = grant.targetHealth
		? resolveAmount(grant.targetHealth.ratio, effect, sim.context)
		: 0
	if (share === undefined) return undefined
	const maximum = sim.input.target.health
	const current = sim.hitHealth ?? sim.health
	const ofHealth = grant.targetHealth
		? share * targetHealth(grant.targetHealth.health, { maximum, current })
		: 0
	const missing = 1 - current / maximum
	const bonus = 1 + (grant.missingHealthBonus ?? 0) * missing
	const raw = (base + ratioDamage(grant.ratios, stats)) * scale + ofHealth
	return { type, raw: raw * bonus }
}

function dealGrantDamage(
	sim: Simulation,
	grant: EffectDamage,
	effect: BuildEffect,
	source: DamageSource,
) {
	const damage = grantDamage(sim, grant, effect)
	if (!damage) {
		notModeledHit(sim, source, ["a value it lacks"])
		return
	}
	deal(sim, { source, ...damage })
}

/** What a grant does as its effect takes effect: its damage, or on-hit applied once more (a phantom hit). */
function dealGrantNow(
	sim: Simulation,
	grant: Grant,
	effect: BuildEffect,
	pending: PendingMarks,
) {
	const source = { kind: "effect", effectId: effect.id } as const
	if (grant.kind === "abilityDamage") {
		const { ability, name, proc } = grant
		dealAbilityDamage(sim, ability, name, source, { proc })
	}
	if (grant.kind === "damage") dealGrantDamage(sim, grant, effect, source)
	if (grant.kind === "applyOnHit") {
		const previous = sim.onHitOf
		sim.onHitOf = effect.id
		onHit(sim, pending, "effect")
		sim.onHitOf = previous
	}
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
				counters: countersNow(sim, ability),
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
	/** What dealt the damage that triggers it, which its `stacks.gain` reads. */
	by?: keyof StackGain
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
	const {
		applies,
		endsOn,
		stacks,
		cooldownFrom,
		delay,
		startsAfter,
		resets,
		consumes,
		requiresReady,
		requiresMaxStacks,
	} = effect.effect
	if (requiresReady && isOnCooldown(sim, requiresReady)) return
	if (requiresMaxStacks && !isAtMaxStacks(sim, requiresMaxStacks)) return
	const cooldownAtTrigger = !endsOn && !cooldownFrom
	if (delay && !landing) {
		// Its cooldown runs from the trigger, so it can't trigger again while it waits to land.
		if (cooldownAtTrigger) startCooldown(sim, effect)
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
	if (resets) resetStacks(sim, resets, pending)
	if (consumes) consume(sim, consumes)
	if (applies) pending.push({ ...applies, by: effect })
	if (!isEndedBy(effect, "on-hit")) {
		for (const grant of effect.effect.grants) {
			dealGrantNow(sim, grant, effect, pending)
		}
	}
	if (cooldownAtTrigger && !(delay && landing)) startCooldown(sim, effect)

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
		if (!stacks?.keepsDuration) running.endsAt = sim.time + duration
		running.lastTickAt = areaLastTickAt(sim, effect, options.duration)
		running.stacks = Math.min(
			stackLimit(sim, effect),
			running.stacks + stackGain(sim, effect, options.by),
		)
		if (running.charges) running.charges.used = 0
		if (dot) {
			const kind = running.stacks > before ? "stacked" : "refreshed"
			recordApplication(sim, running, { owner, kind }, { landing })
		}
		if (running.stacks > before && running.stacks === stacks?.max) {
			triggerOnMaxStacks(sim, effect, pending)
		}
		return
	}
	const instance = newInstance(sim, effect, duration)
	instance.stacks = Math.min(
		stackLimit(sim, effect),
		stackGain(sim, effect, options.by),
	)
	const lastTickAt = areaLastTickAt(sim, effect, options.duration)
	if (lastTickAt !== undefined) instance.lastTickAt = lastTickAt
	sim.active.push(instance)
	if (!dot) return
	recordApplication(sim, instance, { owner, kind: "applied" }, { landing })
	if (nextTickAt(instance) === sim.time) tick(sim, instance)
}

/** The stacks a trigger adds: its `stacks.gain` by what dealt the damage, else one. */
function stackGain(
	sim: Simulation,
	effect: BuildEffect,
	by: keyof StackGain | undefined,
): number {
	const gain = effect.effect.stacks?.gain
	if (!gain || !by) return 1
	return resolveAmount(gain[by], effect, sim.context) ?? 1
}

function isOnCooldown(sim: Simulation, effectId: string): boolean {
	return (sim.effectsReadyAt.get(effectId) ?? 0) > sim.time
}

/** Whether the effect is at its most stacks: as the hit began, while its on-hit effects run (`maxedAtHit`). */
function isAtMaxStacks(sim: Simulation, effectId: string): boolean {
	return (sim.maxedAtHit ?? maxedEffects(sim)).has(effectId)
}

/** The running effects at their most stacks. */
function maxedEffects(sim: Simulation): Set<string> {
	return new Set(
		sim.active
			.filter(({ effect, stacks }) => {
				const max = effect.effect.stacks?.max
				return max !== undefined && stacks >= max
			})
			.map(({ effect }) => effect.id),
	)
}

/** Ends the running effect `effectId`, used up (Electrocute's stacks as it strikes). */
function consume(sim: Simulation, effectId: string) {
	for (const instance of sim.active.filter(
		({ effect }) => effect.id === effectId,
	)) {
		expire(sim, instance)
	}
}

/** The most stacks an effect may have now: its `stacks.max`, or less while an effect that `resets` it runs. */
function stackLimit(sim: Simulation, effect: BuildEffect): number {
	let limit = effect.effect.stacks?.max ?? 1
	for (const { effect: running } of sim.active) {
		const { resets } = running.effect
		if (resets?.effect === effect.id) limit = Math.min(limit, resets.stacks)
	}
	return limit
}

/** An effect just reached its `stacks.max`: the effects waiting on it trigger (Blaze's detonation). */
function triggerOnMaxStacks(
	sim: Simulation,
	effect: BuildEffect,
	pending: PendingMarks,
) {
	triggerWhere(
		sim,
		(trigger) =>
			trigger.kind === "on-max-stacks" && trigger.effect === effect.id,
		pending,
	)
}

/** Sets another effect's stacks and refreshes it, or starts it with them (Blaze's detonation leaves one). */
function resetStacks(
	sim: Simulation,
	{ effect: id, stacks }: StackReset,
	pending: PendingMarks,
) {
	const effect = sim.input.effects.find((entry) => entry.id === id)
	if (!effect) return
	const find = () => sim.active.find((instance) => instance.effect.id === id)
	const running = find()
	if (!running) trigger(sim, effect, pending, { ignoreCooldown: true })
	const instance = find()
	if (!instance) return
	instance.stacks = stacks
	if (!running) return
	const duration = effectDuration(effect, sim.context)
	instance.triggeredAt = sim.time
	if (duration !== undefined) instance.endsAt = sim.time + duration
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

/** Its state ran out: it runs now, unless only a break starts it (`needsBreak`: no leap, no reduction). */
function runOut(sim: Simulation, waiting: Waiting) {
	if (waiting.effect.effect.startsAfter?.needsBreak) {
		sim.waiting = sim.waiting.filter((entry) => entry !== waiting)
	} else {
		release(sim, waiting)
	}
}

/**
 * Drops the states `event` ends without running them (`dropsOn`), then breaks those it ends: the
 * attacker's run now (an attack breaks Ambush's camouflage as it starts); the target's are
 * returned, to run after the action's hit (Rengar's leap).
 */
function breakWaiting(sim: Simulation, event: BreakEvent): Waiting[] {
	sim.waiting = sim.waiting.filter(
		({ effect }) => !isCoveredBy(effect.effect.startsAfter?.dropsOn, event),
	)
	const broken = sim.waiting.filter(({ effect }) =>
		isCoveredBy(effect.effect.startsAfter?.endsOn, event),
	)
	const onTarget = broken.filter(
		({ effect }) => effect.effect.holder === "target",
	)
	for (const waiting of broken) {
		if (!onTarget.includes(waiting)) release(sim, waiting)
	}
	return onTarget
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

/** What applies on-hit: an attack, an ability's hit, or an effect's (a phantom hit). */
type OnHitBy = MarkConsumer | "effect"

type OnHitOptions = {
	/** The target's health as the hit began, which on-hit damage reads; the current one by default. */
	targetHealth?: number
	/** The attack is also spell damage (`spellAttack`): `notSpellAttack` effects skip it. */
	spellAttack?: boolean
}

/**
 * On-hit, by an attack, an ability's hit or an effect's: the on-hit effects trigger (an
 * `attacksOnly` one on an attack's, `notSpellAttack` not on a spell one), gated by the stacks as the hit began, then each primed effect
 * spent by an on-hit (a spellblade) deals its damage.
 */
function onHit(
	sim: Simulation,
	pending: PendingMarks,
	by: OnHitBy,
	{ targetHealth = sim.health, spellAttack = false }: OnHitOptions = {},
) {
	const previous = { hitHealth: sim.hitHealth, maxedAtHit: sim.maxedAtHit }
	sim.hitHealth = targetHealth
	sim.maxedAtHit = maxedEffects(sim)
	sim.log.push({ kind: "on-hit", time: sim.time })
	triggerWhere(
		sim,
		(trigger) =>
			trigger.kind === "on-hit" &&
			(by === "attack" || !trigger.attacksOnly) &&
			!(spellAttack && trigger.notSpellAttack),
		pending,
	)
	sim.maxedAtHit = previous.maxedAtHit
	const spent = sim.active.filter(
		({ effect, holder }) =>
			holder === "attacker" && isEndedBy(effect, "on-hit"),
	)
	for (const instance of spent) {
		const source = effectSource(instance)
		for (const grant of instance.effect.effect.grants) {
			if (grant.kind === "abilityDamage") {
				const { ability, name, proc } = grant
				dealAbilityDamage(sim, ability, name, source, { proc })
			}
			if (grant.kind === "damage") {
				dealGrantDamage(sim, grant, instance.effect, source)
			}
		}
		expire(sim, instance)
		startCooldown(sim, instance.effect)
	}
	sim.hitHealth = previous.hitHealth
}

/** Each running effect's `onAttackDamage`, dealt by a basic attack (Hail of Blades' true damage). */
function dealOnAttackDamage(sim: Simulation) {
	for (const instance of sim.active) {
		if (instance.holder !== "attacker") continue
		const atMax = instance.stacks >= (instance.effect.effect.stacks?.max ?? 1)
		for (const grant of instance.effect.effect.grants) {
			if (grant.kind !== "onAttackDamage") continue
			if (grant.atMaxStacks && !atMax) continue
			dealGrantDamage(sim, grant, instance.effect, effectSource(instance))
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
		if (running) addStack(sim, running, pending)
		if (instance?.charges) instance.charges.used++
		const max = effect.effect.stacks?.max ?? 1
		sim.empowered.set(effect.id, {
			happened: !!instance,
			...(instance?.charges && { charge: { ...instance.charges } }),
			...(instance && max > 1 && { stacks: { count: instance.stacks, max } }),
		})
	}
	return held
}

/** A running `on-attack` effect gains a stack as the attack starts (Lethal Tempo); its last one triggers what waits on it. */
function addStack(sim: Simulation, instance: Instance, pending: PendingMarks) {
	const before = instance.stacks
	const { effect } = instance
	instance.stacks = Math.min(stackLimit(sim, effect), before + 1)
	if (
		instance.stacks > before &&
		instance.stacks === effect.effect.stacks?.max
	) {
		triggerOnMaxStacks(sim, effect, pending)
	}
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
	for (const key of itemOutcomeKeys(sim, item)) {
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

/** What happens next on its own before `until`: a delayed effect, a later hit, a tick, an effect or a mark running out, a periodic effect. */
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
		consider(waiting.until, () => runOut(sim, waiting))
	}
	for (const hit of sim.laterHits) {
		consider(hit.at, () => landLaterHit(sim, hit))
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

type StrikeOptions = {
	/** The marks the action's earlier effects apply after the hit (an empowering cast's). */
	pending?: PendingMarks
	/** Deals an empowering cast's bonus right after the attack's own hit (Savagery). */
	bonus?: () => void
	/** The attack doesn't start the attack timer (Shield of Daybreak's). */
	noAttackCooldown?: boolean
	/** The attack is also spell damage (Crippling Strike's). */
	spellAttack?: boolean
}

/** The attack's windup at the attacker's attack speed now (`attackWindupTime`). */
function windupNow(sim: Simulation): number {
	const { attackWindup } = sim.input.build.champion
	return attackWindupTime(attackWindup, statsNow(sim).attackSpeed)
}

/**
 * A basic attack starts now: its on-attack effects start and its timer runs from here. It lands
 * at the end of its windup (hit, on-hit, marks), which is all it keeps the champion busy for; the
 * timer reads the attack speed after the hit (wiki "Attack speed", Attack timer).
 */
function strike(
	sim: Simulation,
	item: CombatItem,
	{
		pending = [],
		bonus,
		noAttackCooldown = false,
		spellAttack = false,
	}: StrikeOptions = {},
) {
	const startedAt = sim.time
	endEffects(sim, "attack")
	pauseEffects(sim, "attack")
	const onTarget = breakWaiting(sim, "attack")
	const held = empowerAttack(sim, pending)
	spendCharges(sim)
	advance(sim, sim.time + windupNow(sim))
	// The attack and its on-hit are one damage event: on-hit reads the health before it (wiki BotRK).
	const targetHealth = sim.health
	deal(sim, {
		source: { kind: "attack" },
		type: "physical",
		raw: statsNow(sim).attackDamage.total * attackMultiplier(sim),
	})
	bonus?.()
	dealOnAttackDamage(sim)
	onHit(sim, pending, "attack", { targetHealth, spellAttack })
	consumeMarks(sim, "attack", pending)
	applyMarks(sim, chooseMarks(sim, pending, item))
	for (const waiting of onTarget) release(sim, waiting)
	if (!noAttackCooldown) {
		sim.nextAttackAt = startedAt + 1 / statsNow(sim).attackSpeed.total
	}
	sim.busyUntil = sim.time
	sim.active.push(...held)
	endSpentCharges(sim)
}

/** What the attacker's running effects multiply a basic attack's damage by (Fishbones' 110% AD). */
function attackMultiplier(sim: Simulation): number {
	let multiplier = 1
	for (const { effect, holder } of sim.active) {
		if (holder !== "attacker" || !isInForm(effect, sim.formId)) continue
		for (const grant of effect.effect.grants) {
			if (grant.kind !== "attackMultiplier") continue
			multiplier *= amountNow(sim, grant.amount, effect) ?? 1
		}
	}
	return multiplier
}

/** When a cast stopping basic attacks lets one start (Judgment's spin); now in free mode or without one. */
function attackLockEnd(sim: Simulation): number {
	const until = sim.attackLock?.until ?? 0
	return sim.free ? sim.time : Math.max(sim.time, until)
}

/** When a basic attack may start: after the attack timer and any cast stopping attacks. */
function attackStartsAt(sim: Simulation): number {
	return Math.max(sim.nextAttackAt, attackLockEnd(sim))
}

/** A basic attack: waits for the attack timer, then starts (`strike`). */
function attack(sim: Simulation, item: CombatItem) {
	advance(sim, attackStartsAt(sim))
	sim.actionStart = sim.log.length
	strike(sim, item)
}

function round(seconds: number) {
	return Math.round(seconds * 100) / 100
}

/** The outcomes an item can have (`outcomeKeys`), an empowering cast's attack ones included. */
function itemOutcomeKeys(sim: Simulation, item: CombatItem): OutcomeKey[] {
	const empowersAttack =
		item.kind === "ability" && !!hitRule(sim, item.slot)?.empowersAttack
	return outcomeKeys(item, sim.input.effects, sim.formId, { empowersAttack })
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

/** The variant a cast picked, else its default (`defaultVariant`); none when its rule has no variants. */
function chosenVariant(
	rule: AbilityHitRule | undefined,
	variant: string | undefined,
): AbilityVariant | undefined {
	const variants = rule?.variants ?? []
	return variants.find(({ id }) => id === variant) ?? defaultVariant(variants)
}

type AbilityHitOptions = {
	/** The effects the target held as the hit landed, before the cast's own (`whenTargetHas`). */
	held?: ReadonlySet<string>
}

/**
 * The tooltip damages a cast deals: its rule's `whenTargetHas` while the target held that effect,
 * its chosen variant's (the first by default), its rule's (one, several or none), else the
 * tooltip's first.
 */
function castDamages(
	spell: ChampionSpell,
	rule: AbilityHitRule | undefined,
	variant: string | undefined,
	{ held }: AbilityHitOptions = {},
): readonly string[] {
	const condition = rule?.whenTargetHas
	if (condition && held?.has(condition.effect)) {
		return damageNames(condition.damage)
	}
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
	options?: AbilityHitOptions,
) {
	const rule = hitRule(sim, spell.slot)
	const names = castDamages(spell, rule, variant, options)
	// The cast's damages are one hit: a share of health reads it before any of them lands, as does on-hit.
	const targetHealth = sim.health
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
		const scale = targetStackScale(sim, rule)
		for (const name of names) {
			const source = { kind: "ability", slot: spell.slot, name } as const
			dealAbilityDamage(sim, spell.slot, name, source, { targetHealth, scale })
		}
	}
	if (rule?.onHit) onHit(sim, pending, "ability", { targetHealth })
	consumeMarks(sim, "ability", pending)
	triggerAfterHit(sim, rule, variant, pending)
}

/** 1 plus the rule's `perTargetStack` bonus per stack of its effect on the target now (Noxian Guillotine). */
function targetStackScale(sim: Simulation, rule: AbilityHitRule | undefined) {
	const bonus = rule?.perTargetStack
	if (!bonus) return 1
	const held = sim.active.find(
		({ effect, holder }) => holder === "target" && effect.id === bonus.effect,
	)
	return 1 + bonus.bonus * (held?.stacks ?? 0)
}

/** The effect a hit triggers once it lands (`triggers`, its variant's first): Condemn's Silver Bolts stack. */
function triggerAfterHit(
	sim: Simulation,
	rule: AbilityHitRule | undefined,
	variant: string | undefined,
	pending: PendingMarks,
) {
	const id = chosenVariant(rule, variant)?.triggers ?? rule?.triggers
	const effect = id && sim.input.effects.find((entry) => entry.id === id)
	if (effect) trigger(sim, effect, pending)
}

/**
 * An empowering cast's attack (`empowersAttack`): it waits for the attack timer unless the cast
 * resets it (it starts at once), then lands as an attack with the cast's damage as a bonus hit
 * (Savagery).
 */
function empoweredAttack(
	sim: Simulation,
	action: Extract<CombatAction, { kind: "ability" }>,
	{ spell, rule, pending }: EmpoweredAttackInput,
) {
	const { empowersAttack } = rule
	// Its attack is declared like any other: a cast stopping attacks holds it (Decisive Strike in Judgment).
	if (empowersAttack?.resetsAttack) {
		advance(sim, attackLockEnd(sim))
		sim.nextAttackAt = sim.time
	} else {
		advance(sim, attackStartsAt(sim))
	}
	strike(sim, action, {
		pending,
		noAttackCooldown: !!empowersAttack?.noAttackCooldown,
		spellAttack: !!empowersAttack?.spellAttack,
		bonus: () => {
			const names = castDamages(spell, rule, action.variant)
			const options = {
				withoutAttack: !!empowersAttack?.includesAttack,
				proc: !!empowersAttack?.procBonus,
			}
			for (const name of names) {
				const source = { kind: "ability", slot: spell.slot, name } as const
				dealAbilityDamage(sim, spell.slot, name, source, options)
			}
		},
	})
}

type EmpoweredAttackInput = {
	spell: ChampionSpell
	rule: AbilityHitRule
	/** The marks the cast's effects apply, after the attack's hit. */
	pending: PendingMarks
}

/** The effects the target holds now, by id. */
function targetEffectIds(sim: Simulation): Set<string> {
	return new Set(
		sim.active
			.filter(({ holder }) => holder === "target")
			.map(({ effect }) => effect.id),
	)
}

/** The hits a rule's `attackSpeedHits` make now: its `base`, plus one per step of bonus attack speed. */
function attackSpeedHits(
	sim: Simulation,
	{ base, perBonusAttackSpeed, over }: AttackSpeedHits,
): LaterHits {
	const { ratio } = sim.input.build.champion.stats.attackSpeed
	const bonus = statsNow(sim).attackSpeed.bonus / ratio
	// A hair over each step, so a float just under 25% still counts as 25%.
	const count = base + Math.floor(bonus / perBonusAttackSpeed + 1e-9)
	return { count, every: over / count }
}

/** The cast's hits on the target: its variant's `hits`, else its rule's `attackSpeedHits` now. */
function castHits(
	sim: Simulation,
	rule: AbilityHitRule | undefined,
	variant: string | undefined,
): LaterHits | undefined {
	const scaled = rule?.attackSpeedHits
	return (
		chosenVariant(rule, variant)?.hits ??
		(scaled && attackSpeedHits(sim, scaled))
	)
}

type LaterHitsSchedule = {
	hits: LaterHits | undefined
	/** When its first hit lands. */
	firstAt: number
	/** The end of its time in the area: later hits land up to it, the one exactly then included. */
	until: number
}

/** The cast's hits after its first, each `every` seconds later up to `until`, for this step. */
function scheduleLaterHits(
	sim: Simulation,
	spell: ChampionSpell,
	variant: string | undefined,
	{ hits, firstAt, until }: LaterHitsSchedule,
) {
	if (!hits) return
	let count = 1
	for (let index = 1; index < hits.count; index++) {
		const at = firstAt + index * hits.every
		if (at > until + AREA_EPSILON) break
		sim.laterHits.push({ at, spell, variant, owner: sim.step })
		count++
	}
	if (hitRule(sim, spell.slot)?.attackSpeedHits) {
		sim.castHits.set(sim.step, { count, of: hits.count })
	}
}

/**
 * A cast's later hit lands, for its step: the `on-cast` effects marked `perHit` (a Blaze stack),
 * then the cast's hit again. Free mode's choices of the action running don't reach it.
 */
function landLaterHit(sim: Simulation, hit: LaterHit) {
	sim.laterHits = sim.laterHits.filter((entry) => entry !== hit)
	const { spell, variant, owner, first } = hit
	const held = targetEffectIds(sim)
	const pending: PendingMarks = []
	const { owner: previous, forced } = sim
	sim.owner = owner
	sim.laterHitOf = owner
	sim.forced = undefined
	triggerWhere(
		sim,
		(trigger) =>
			!first &&
			trigger.kind === "on-cast" &&
			!!trigger.perHit &&
			(trigger.slots?.includes(spell.slot) ?? true),
		pending,
	)
	abilityHit(sim, spell, pending, variant, { held })
	applyMarks(sim, pending)
	sim.owner = previous
	sim.laterHitOf = undefined
	sim.forced = forced
	sim.afterLaterHits.set(owner, snapshot(sim))
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
	// A recast waits for the gap between casts instead (`recastAt`), like an attack for its timer.
	if (openRecast(sim, spell.slot)) return undefined
	const readyAt = sim.cooldowns.get(spell.slot) ?? 0
	if (readyAt > sim.time && !sim.free) {
		return `${spell.name} is on cooldown until ${round(readyAt)} s`
	}
	return undefined
}

/** The ability's recast window, while it has a recast left and time to use it (`Recasts`). */
function openRecast(
	sim: Simulation,
	slot: AbilitySlot,
): RecastWindow | undefined {
	const window = sim.recasts.get(slot)
	return window && window.left > 0 && sim.time < window.until
		? window
		: undefined
}

/** When a cast of the ability may start: after the gap since its last recast, else now. Free mode doesn't wait. */
function recastAt(sim: Simulation, slot: AbilitySlot): number {
	const window = openRecast(sim, slot)
	return window && !sim.free ? Math.max(sim.time, window.nextAt) : sim.time
}

/**
 * When a cast of the ability may start: after its recast gap, and after a cast stopping attacks
 * whose `waitedForBy` names it (Demacian Justice after Judgment). Free mode skips the recast gap
 * but still waits for that cast: its time is the user's choice, not a cooldown (PR 445).
 */
function abilityStartsAt(sim: Simulation, slot: AbilitySlot): number {
	const lock = sim.attackLock
	const until = lock?.waitedForBy.includes(slot) ? lock.until : 0
	return Math.max(recastAt(sim, slot), until)
}

/**
 * Uses a recast, or opens the window a first cast of a rule with `recasts` starts; returns whether
 * this cast was a recast, which leaves the first cast's cooldown as it is.
 */
function spendRecast(
	sim: Simulation,
	slot: AbilitySlot,
	rule: AbilityHitRule | undefined,
): boolean {
	const window = openRecast(sim, slot)
	const every = rule?.recasts?.every ?? 0
	if (window) {
		window.left--
		window.nextAt = sim.time + every
		return true
	}
	if (rule?.recasts) {
		const { count, within } = rule.recasts
		sim.recasts.set(slot, {
			left: count,
			until: sim.time + within,
			nextAt: sim.time + every,
		})
	}
	return false
}

/** The cast time now: the synced one, shorter with bonus attack speed when its rule says so (Zap!). */
function castTimeNow(
	sim: Simulation,
	spell: ChampionSpell,
	rule: AbilityHitRule | undefined,
): number {
	const synced = spell.castTime ?? 0
	const scaled = rule?.attackSpeedCastTime
	if (!scaled) return synced
	const { ratio } = sim.input.build.champion.stats.attackSpeed
	const bonus = statsNow(sim).attackSpeed.bonus / ratio
	const progress = Math.min(1, bonus / scaled.fullAt)
	return synced + (scaled.min - synced) * progress
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

/** What the attacker's running effects multiply a cast's cooldown by (Fury of the Sands halves Siphoning Strike's). */
function cooldownMultiplier(sim: Simulation, slot: AbilitySlot): number {
	let multiplier = 1
	for (const { effect, holder } of sim.active) {
		if (holder !== "attacker") continue
		for (const grant of effect.effect.grants) {
			if (grant.kind !== "cooldownMultiplier" || !grant.slots.includes(slot)) {
				continue
			}
			const amount = amountNow(sim, grant.amount, effect)
			if (amount === undefined) continue
			multiplier *= grant.reduction ? 1 - amount : amount
		}
	}
	return multiplier
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
	advance(sim, abilityStartsAt(sim, slot))

	const pending: PendingMarks = []
	const castAt = sim.time
	sim.log.push({
		kind: "cast",
		time: sim.time,
		source: { kind: "ability", slot },
	})
	reduceCooldownsOnCast(sim)
	const rule = hitRule(sim, slot)
	const recast = spendRecast(sim, slot, rule)
	const castTime = castTimeNow(sim, spell, rule)
	// An empowering cast counts as its attack for endsOn, pauses and startsAfter, never as a cast.
	const empowering = rule?.empowersAttack ? rule : undefined
	const cast = { kind: "cast", slot } as const
	if (!empowering) {
		endEffects(sim, cast)
		pauseEffects(sim, "cast")
	}
	const onTarget = empowering ? [] : breakWaiting(sim, cast)
	const area = rule?.timeInArea
	const inArea = area && areaSeconds(area, action.inArea)
	// The cast's own effects run the time in the area plus what lingers (Poison Trail's 2 s).
	const areaTime =
		area && inArea !== undefined ? inArea + (area.after ?? 0) : undefined
	const held = targetEffectIds(sim)
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
	if (empowering) {
		empoweredAttack(sim, action, { spell, rule: empowering, pending })
	} else {
		const hits = castHits(sim, rule, action.variant)
		// Spreading hits over a time land as each share ends (Judgment's spins, wiki).
		const spreadFirst = rule?.attackSpeedHits && hits ? hits.every : 0
		const hitAt = rule?.landsAtCastEnd
			? sim.time + castTime
			: sim.time + spreadFirst
		if (hitAt > sim.time) {
			const { variant } = action
			sim.laterHits.push({
				at: hitAt,
				spell,
				variant,
				owner: sim.step,
				first: true,
			})
		} else {
			abilityHit(sim, spell, pending, action.variant, { held })
		}
		const until =
			inArea === undefined ? Number.POSITIVE_INFINITY : castAt + inArea
		scheduleLaterHits(sim, spell, action.variant, {
			hits,
			firstAt: hitAt,
			until,
		})
		if (rule?.blocksAttacks && inArea !== undefined) {
			sim.attackLock = { ...rule.blocksAttacks, until }
		}
		applyMarks(sim, chooseMarks(sim, pending, action))
		for (const waiting of onTarget) release(sim, waiting)
	}
	if (!recast) {
		const cooldown = spell.cooldown[rank - 1] ?? 0
		const haste = statsNow(sim).abilityHaste.total
		sim.cooldowns.set(
			slot,
			castAt + abilityCooldown(cooldown, haste) * cooldownMultiplier(sim, slot),
		)
	}
	// An empowered attack keeps the champion busy for its windup (`strike`), not its cast time.
	if (!empowering) sim.busyUntil = sim.time + castTime
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
	return itemOutcomeKeys(sim, action).map((key) => ({
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
	for (const key of itemOutcomeKeys(sim, item)) {
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

/** An effect's most stacks, when it has several. */
function maxStacksView({
	effect,
}: BuildEffect): Pick<ActiveEffect, "maxStacks"> {
	const max = effect.stacks?.max ?? 1
	return max > 1 ? { maxStacks: max } : {}
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

type StepState = Pick<CombatStep, "active" | "waiting" | "marks" | "resists">

function snapshot(sim: Simulation): StepState {
	const waiting = waitingView(sim)
	const reductions = targetReductions(sim)
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
					...maxStacksView(effect),
					...pausedView(sim, { effect, pausedUntil }),
				}),
			),
		...(waiting.length > 0 && { waiting }),
		marks: sim.marks.map(({ mark, endsAt }) => ({ mark, endsAt })),
		...(reductions.length > 0 && {
			resists: reducedResists(sim.input.target, reductions),
		}),
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

/** When the action starts: an attack after the attack timer, a recast after its gap, the rest now. */
function actionStartsAt(sim: Simulation, item: CombatAction): number {
	if (item.kind === "attack") return attackStartsAt(sim)
	return item.kind === "ability" ? abilityStartsAt(sim, item.slot) : sim.time
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
	// An action owns what happens from it until the next action starts (a burn ticking on), and its
	// cast's later hits; markers own nothing.
	const closeStep = () => {
		const last = steps.findLast(({ action }) => action.kind !== "situation")
		for (const event of sim.log.slice(logged)) {
			const owner = event.kind === "hit" ? event.laterHit?.owner : undefined
			const step = owner === undefined ? last : steps[owner]
			step?.events.push(event)
		}
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
		const startedAt = actionStartsAt(sim, item)
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
	for (const [owner, state] of sim.afterLaterHits) {
		const step = steps[owner]
		if (step) step.afterLaterHits = state
	}
	settleDamageOverTime(sim, steps)
	for (const [index, hits] of sim.castHits) {
		const step = steps[index]
		if (step) step.hits = hits
	}
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
