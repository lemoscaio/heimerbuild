import type {
	AbilitySlot,
	Champion,
	ChampionSpell,
	DamageType,
} from "@schemas/champion"
import { isInPatchRange } from "@schemas/patch-range"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { isOnByDefault, isSwitchable } from "../effects/defaults"
import type {
	BuildEffect,
	EndsOn,
	Grant,
	MarkApplication,
	MarkConsumer,
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
import { spellCooldown } from "../summoner-rune-interactions"
import type { SummonerSlot } from "../summoner-slots"
import type {
	ActiveEffect,
	CombatAction,
	CombatEvent,
	CombatResult,
	CombatStep,
	CombatTarget,
	DamageSource,
	DamageTotals,
	EffectHolder,
} from "./combat"
import { abilityCooldown, evaluateDamage } from "./damage-formula"
import { mitigate } from "./mitigation"
import {
	ABILITY_HIT_RULES,
	type AbilityHitRule,
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
	actions: readonly CombatAction[]
}

export type SimulateCombatOptions = {
	/** How abilities hit; the curated rules by default. */
	hitRules?: readonly AbilityHitRule[]
}

type Instance = {
	effect: BuildEffect
	holder: EffectHolder
	startedAt: number
	endsAt: number
	stacks: number
	/** Ticks of a damage over time dealt so far. */
	ticks: number
}

type Mark = MarkApplication & { endsAt: number }

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
	health: number
	log: CombatEvent[]
	step: number
	kill?: { time: number; step: number }
}

/** Marks to put on the target once the action's hit is done (Vault deals its damage, then marks). */
type PendingMarks = MarkApplication[]

function createSimulation(
	input: CombatInput,
	hitRules: readonly AbilityHitRule[],
): Simulation {
	const { champion, form, ranks, level, items } = input.build
	const formId = selectedForm(champion.forms, form, { ranks })?.id
	const startsOn = input.effects.filter(
		({ effect }) => isOnByDefault(effect) && effect.holder !== "target",
	)
	return {
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
			endsAt: Number.POSITIVE_INFINITY,
			stacks: 1,
			ticks: 0,
		})),
		marks: [],
		health: input.target.health,
		log: [],
		step: 0,
	}
}

/** The attacker's stats now: `computeBuildStats` with the effects running on the attacker. */
function statsNow(sim: Simulation): ComputedStats {
	const own = sim.input.effects.filter(
		({ effect }) => effect.holder !== "target",
	)
	const running = sim.active.filter(({ holder }) => holder === "attacker")
	const runningIds = new Set(running.map(({ effect }) => effect.id))
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
		},
	})
}

function deal(
	sim: Simulation,
	{
		source,
		type,
		raw,
	}: { source: DamageSource; type: DamageType; raw: number },
) {
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
	})
}

function notModeledHit(
	sim: Simulation,
	source: DamageSource,
	reasons: readonly string[],
) {
	sim.log.push({ kind: "hit", time: sim.time, source, notModeled: reasons })
}

/** A synced ability damage by name (`abilityDamage` grant or a cast's hit), at the ability's rank. */
function dealAbilityDamage(
	sim: Simulation,
	ability: AbilitySlot | "passive",
	name: string,
	source: DamageSource,
) {
	const { champion, ranks, level } = sim.input.build
	const damage =
		ability === "passive"
			? champion.abilities.passive.damage
			: sim.spells.find(({ slot }) => slot === ability)?.damage
	const formula = damage?.find((entry) => entry.name === name)
	if (!formula) {
		notModeledHit(sim, source, [`no synced damage named ${name}`])
		return
	}
	const raw = evaluateDamage(formula, {
		stats: statsNow(sim),
		level,
		...(ability !== "passive" && { rank: ranks?.[ability] }),
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

function startCooldown(sim: Simulation, effect: BuildEffect) {
	const { cooldown } = effect.effect
	const seconds =
		cooldown === undefined
			? undefined
			: resolveAmount(cooldown, effect, sim.context)
	if (seconds !== undefined) {
		sim.effectsReadyAt.set(effect.id, sim.time + seconds)
	}
}

/** One damage over time tick: the grant's amount, now. */
function tick(sim: Simulation, instance: Instance) {
	for (const grant of instance.effect.effect.grants) {
		if (grant.kind !== "damageOverTime") continue
		const raw = resolveAmount(grant.amount, instance.effect, sim.context)
		const source = { kind: "effect", effectId: instance.effect.id } as const
		if (raw === undefined) notModeledHit(sim, source, ["a value it lacks"])
		else deal(sim, { source, type: grant.damageType, raw })
	}
	instance.ticks++
}

function tickEvery({ effect }: Instance): number | undefined {
	return effect.effect.grants.find((grant) => grant.kind === "damageOverTime")
		?.every
}

function nextTickAt(instance: Instance): number | undefined {
	const every = tickEvery(instance)
	if (every === undefined) return undefined
	const at = instance.startedAt + instance.ticks * every
	return at < instance.endsAt ? at : undefined
}

/**
 * Starts an effect whose trigger matched: its mark waits for the hit, an `abilityDamage` lands
 * now, and one with a duration runs (or refreshes, one more stack). Its cooldown gates it.
 */
function trigger(sim: Simulation, effect: BuildEffect, pending: PendingMarks) {
	if (!isInForm(effect, sim.formId)) return
	if ((sim.effectsReadyAt.get(effect.id) ?? 0) > sim.time) return
	const { applies, endsOn, holder, stacks } = effect.effect
	if (applies) pending.push(applies)
	for (const grant of effect.effect.grants) dealGrantNow(sim, grant, effect)
	if (!endsOn) startCooldown(sim, effect)

	const duration = effectDuration(effect, sim.context)
	if (!duration) return
	const running = sim.active.find(
		(instance) => instance.effect.id === effect.id,
	)
	if (running) {
		running.endsAt = sim.time + duration
		running.stacks = Math.min(stacks?.max ?? 1, running.stacks + 1)
		return
	}
	const instance: Instance = {
		effect,
		holder: holder ?? "attacker",
		startedAt: sim.time,
		endsAt: sim.time + duration,
		stacks: 1,
		ticks: 0,
	}
	sim.active.push(instance)
	if (tickEvery(instance) !== undefined) tick(sim, instance)
}

function triggerWhere(
	sim: Simulation,
	matches: (trigger: Trigger, effect: BuildEffect) => boolean,
	pending: PendingMarks,
) {
	for (const effect of sim.input.effects) {
		if (matches(effect.effect.trigger, effect)) trigger(sim, effect, pending)
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

/** Ends the attacker's effects that stop on `reason`; their cooldown starts now. */
function endEffects(sim: Simulation, reason: EndsOn) {
	for (const instance of sim.active.filter(
		({ effect, holder }) =>
			holder === "attacker" && effect.effect.endsOn === reason,
	)) {
		expire(sim, instance)
		startCooldown(sim, instance.effect)
	}
}

/** On-hit: the on-hit effects trigger, then each primed effect spent by an on-hit (a spellblade) deals its damage. */
function onHit(sim: Simulation, pending: PendingMarks) {
	sim.log.push({ kind: "on-hit", time: sim.time })
	triggerWhere(sim, ({ kind }) => kind === "on-hit", pending)
	const spent = sim.active.filter(
		({ effect, holder }) =>
			holder === "attacker" && effect.effect.endsOn === "on-hit",
	)
	for (const instance of spent) {
		const stats = statsNow(sim)
		for (const grant of instance.effect.effect.grants) {
			if (grant.kind !== "damage") continue
			const { baseAttackDamage = 0, abilityPower = 0 } = grant.ratios
			deal(sim, {
				source: { kind: "effect", effectId: instance.effect.id },
				type: grant.damageType,
				raw:
					baseAttackDamage * stats.attackDamage.base +
					abilityPower * stats.abilityPower.total,
			})
		}
		expire(sim, instance)
		startCooldown(sim, instance.effect)
	}
}

function consumeMarks(
	sim: Simulation,
	by: MarkConsumer,
	pending: PendingMarks,
) {
	const consumed = sim.marks.filter(({ consumedBy }) => consumedBy.includes(by))
	sim.marks = sim.marks.filter((mark) => !consumed.includes(mark))
	for (const { mark } of consumed) {
		sim.log.push({ kind: "mark-consumed", time: sim.time, mark })
		triggerWhere(
			sim,
			(trigger) => trigger.kind === "on-mark-consumed" && trigger.mark === mark,
			pending,
		)
	}
}

function applyMarks(sim: Simulation, pending: PendingMarks) {
	for (const application of pending) {
		const endsAt = sim.time + application.duration
		sim.marks = [
			...sim.marks.filter(({ mark }) => mark !== application.mark),
			{ ...application, endsAt },
		]
		sim.log.push({
			kind: "mark-applied",
			time: sim.time,
			mark: application.mark,
			endsAt,
		})
	}
}

/** What happens next on its own before `until`: a tick, an effect or a mark running out. */
function nextTimedEvent(sim: Simulation, until: number) {
	let next: { at: number; run: () => void } | undefined
	const consider = (at: number | undefined, run: () => void) => {
		if (at !== undefined && at <= until && (!next || at < next.at)) {
			next = { at, run }
		}
	}
	for (const instance of sim.active) {
		consider(nextTickAt(instance), () => tick(sim, instance))
		if (Number.isFinite(instance.endsAt)) {
			consider(instance.endsAt, () => expire(sim, instance))
		}
	}
	for (const mark of sim.marks) {
		consider(mark.endsAt, () => {
			sim.marks = sim.marks.filter((running) => running !== mark)
			sim.log.push({ kind: "expire", time: sim.time, mark: mark.mark })
		})
	}
	return next
}

/** Moves the clock to `until`, running every tick and expiry on the way, in time order. */
function advance(sim: Simulation, until: number) {
	for (
		let next = nextTimedEvent(sim, until);
		next;
		next = nextTimedEvent(sim, until)
	) {
		sim.time = Math.max(sim.time, next.at)
		next.run()
	}
	if (Number.isFinite(until)) sim.time = Math.max(sim.time, until)
}

/** A basic attack: waits for the attack timer, hits, applies on-hit, consumes marks; the next one is 1 / attack speed later. */
function attack(sim: Simulation) {
	advance(sim, Math.max(sim.time, sim.nextAttackAt))
	const pending: PendingMarks = []
	endEffects(sim, "attack")
	deal(sim, {
		source: { kind: "attack" },
		type: "physical",
		raw: statsNow(sim).attackDamage.total,
	})
	onHit(sim, pending)
	consumeMarks(sim, "attack", pending)
	applyMarks(sim, pending)
	sim.nextAttackAt = sim.time + 1 / statsNow(sim).attackSpeed.total
	sim.busyUntil = sim.nextAttackAt
}

function round(seconds: number) {
	return Math.round(seconds * 100) / 100
}

function hitRule(sim: Simulation, slot: AbilitySlot) {
	const { champion, patch } = sim.input.build
	return sim.hitRules.find(
		(rule) =>
			rule.championKey === champion.key &&
			rule.slot === slot &&
			isInPatchRange(patch, rule),
	)
}

/** The cast's hit: its rule's damage, else the tooltip's first; it may apply on-hit, and it consumes the marks abilities do. */
function abilityHit(
	sim: Simulation,
	spell: ChampionSpell,
	pending: PendingMarks,
) {
	const rule = hitRule(sim, spell.slot)
	const name =
		rule?.damage === undefined ? spell.damage?.[0]?.name : rule.damage
	if (!rule?.notModeled && !name) return
	const source = {
		kind: "ability",
		slot: spell.slot,
		name: name ?? spell.damage?.[0]?.name ?? spell.name,
	} as const
	if (rule?.notModeled) notModeledHit(sim, source, [rule.notModeled])
	else if (name) dealAbilityDamage(sim, spell.slot, name, source)
	if (rule?.onHit) onHit(sim, pending)
	consumeMarks(sim, "ability", pending)
}

/** Why an ability can't be cast now; undefined when it can. */
function abilityRefusal(
	sim: Simulation,
	spell: ChampionSpell,
	rank: number,
): string | undefined {
	if (rank < 1) return `${spell.name} has no point yet`
	if (spell.unavailable) return spell.unavailable.reason
	const readyAt = sim.cooldowns.get(spell.slot) ?? 0
	if (readyAt > sim.time) {
		return `${spell.name} is on cooldown until ${round(readyAt)} s`
	}
	return undefined
}

function castAbility(sim: Simulation, slot: AbilitySlot): string | undefined {
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
	endEffects(sim, "cast")
	triggerWhere(
		sim,
		(trigger, { effect }) =>
			trigger.kind === "after-ability" ||
			(trigger.kind === "on-cast" && (trigger.slots?.includes(slot) ?? true)) ||
			(trigger.kind === "after-use" &&
				effect.source.kind === "ability" &&
				effect.source.slot === slot),
		pending,
	)
	abilityHit(sim, spell, pending)
	applyMarks(sim, pending)
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
	if (readyAt > sim.time) {
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
	switch (action.kind) {
		case "attack":
			attack(sim)
			return undefined
		case "ability":
			return castAbility(sim, action.slot)
		case "summoner":
			return castSummoner(sim, action.slot)
		case "wait":
			if (!(action.seconds > 0)) return "A wait needs a positive time"
			advance(sim, sim.time + action.seconds)
			return undefined
	}
}

function snapshot(sim: Simulation): Pick<CombatStep, "active" | "marks"> {
	return {
		active: sim.active
			.filter(({ effect }) => isInForm(effect, sim.formId))
			.map(
				({ effect, holder, startedAt, endsAt, stacks }): ActiveEffect => ({
					effectId: effect.id,
					holder,
					startedAt,
					endsAt,
					stacks,
				}),
			),
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
 * damage after mitigation. Pure; see docs/frontend-architecture.md, Combat.
 */
export function simulateCombat(
	input: CombatInput,
	{ hitRules = ABILITY_HIT_RULES }: SimulateCombatOptions = {},
): CombatResult {
	const sim = createSimulation(input, hitRules)
	const steps: CombatStep[] = []
	let logged = 0
	// A step owns what happens from its action until the next one starts (a burn ticking on).
	const closeStep = () => {
		const last = steps.at(-1)
		last?.events.push(...sim.log.slice(logged))
		if (last) last.targetHealth = sim.health
		logged = sim.log.length
	}
	for (const [index, action] of input.actions.entries()) {
		advance(sim, sim.time)
		closeStep()
		sim.step = index
		const startedAt = Math.max(
			sim.time,
			action.kind === "attack" ? sim.nextAttackAt : sim.time,
		)
		const refused = run(sim, action)
		steps.push({
			action,
			time: startedAt,
			...(refused && { refused }),
			events: [],
			...snapshot(sim),
			targetHealth: sim.health,
		})
		advance(sim, sim.busyUntil)
	}
	advance(sim, Number.POSITIVE_INFINITY)
	closeStep()
	return {
		steps,
		...totals(sim.log),
		...(sim.kill && { kill: sim.kill }),
		duration: Math.max(sim.time, sim.log.at(-1)?.time ?? 0),
	}
}
