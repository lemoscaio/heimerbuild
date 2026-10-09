import type { AbilitySlot, DamageType } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { SummonerSlot } from "../summoner-slots"
import type { Resists } from "./mitigation"

/**
 * One step of a combo: a basic attack, an ability of the current form, a summoner spell, or a wait.
 * An ability may name the `variant` the player picked (Decimate's outer blade or inner handle), and
 * the seconds the target stays in its area (`inArea`, its rule's `timeInArea`; the full time without).
 */
export type CombatAction =
	| { kind: "attack" }
	| { kind: "ability"; slot: AbilitySlot; variant?: string; inArea?: number }
	| { kind: "summoner"; slot: SummonerSlot }
	| { kind: "wait"; seconds: number }

/** A point of the combo from which an effect's situation holds (Hail of Blades ready), by effect id. */
export type SituationMarker = { kind: "situation"; effectId: string }

/** What a combo is made of, in order: its actions and its situation markers. */
export type CombatItem = CombatAction | SituationMarker

/** Longer combos stop adding: a fight is a few seconds of actions (markers count too). */
export const MAX_COMBAT_STEPS = 30

/**
 * What a marker did. While a use in the combo still has its effect on cooldown (until `readyAt`),
 * strict mode `ignored` it and free mode `forced` it. `no-effect`: its situation already held, or
 * the build lacks the effect. `readyAt` on an applied one: when that cooldown had run out.
 */
export type SituationStatus =
	| { status: "applied"; readyAt?: number }
	| { status: "ignored"; readyAt: number }
	| { status: "forced"; readyAt: number }
	| {
			status: "no-effect"
			reason: "already-marked" | "already-running" | "unavailable"
	  }

/**
 * A result the rules decide at a step, which free mode lets the user set: an effect empowering an
 * attack (Hail of Blades), a mark applied by a cast, a mark consumed, a damage over time applied
 * (Toxic Shot's poison, Liandry's burn).
 */
export type OutcomeKey =
	| { kind: "empowered"; effectId: string }
	| { kind: "mark-applied"; mark: string }
	| { kind: "mark-consumed"; mark: string }
	| { kind: "damage-over-time"; effectId: string }

/**
 * An outcome at a step and whether it happened; `charge` is the attack's place among an effect's
 * charges (Hail of Blades 2/3), `readyAt` when an effect that didn't empower it comes off cooldown.
 */
export type StepOutcome = OutcomeKey & {
	happened: boolean
	charge?: { used: number; max: number }
	/** An empowering effect's stacks after the attack (Lethal Tempo 3/6). */
	stacks?: { count: number; max: number }
	readyAt?: number
}

/** Free mode's outcomes at a step, by `outcomeId`: true makes one happen, false prevents it. */
export type OutcomeChoices = Readonly<Record<string, boolean>>

/**
 * What the combo is used against: a dummy now, later the opponent's build, in the same shape.
 * `health` is its maximum; it starts full.
 */
export type CombatTarget = {
	health: number
	armor: number
	magicResist: number
	level: number
}

/**
 * What dealt a hit: a basic attack, an ability's synced damage by name, or an effect (spellblade,
 * Ignite); `fromSituation` when a situation marker set the effect running.
 */
export type DamageSource =
	| { kind: "attack" }
	| { kind: "ability"; slot: AbilitySlot | "passive"; name: string }
	| { kind: "effect"; effectId: string; fromSituation?: true }

/** A hit's damage before (`raw`) and after (`final`) the target's resistances. */
export type DealtDamage = { type: DamageType; raw: number; final: number }

/** What started an action's `cast` event. */
export type CastSource =
	| { kind: "ability"; slot: AbilitySlot }
	| { kind: "summoner"; slot: SummonerSlot; spellKey: string }

/** Who holds an effect: the attacker, or the target (Ignite's burn). */
export type EffectHolder = "attacker" | "target"

/** A damage over time's tick, and the step whose application it belongs to (by item index). */
export type TickOwner = { owner: number }

/**
 * A hit an earlier step's effect deals once its delay or state is over (Counter Strike's strike 1 s
 * after the cast, Blaze's detonation): the step it belongs to. It stays among the events of the step
 * running when it lands, which its card shows.
 */
export type DelayedHit = { delayed?: TickOwner }

/** Everything that happens, in order; `time` is seconds from the combo's start. */
export type CombatEvent =
	| { kind: "cast"; time: number; source: CastSource }
	| {
			kind: "hit"
			time: number
			source: DamageSource
			damage: DealtDamage
			tick?: TickOwner
			/** A later hit of its cast (Pyroclasm's bounces), on the step of the cast (`LaterHits`). */
			laterHit?: TickOwner
			/** {@link DelayedHit} */
			delayed?: TickOwner
	  }
	/** A hit the simulator has no number for, with why (a share of the target's health). */
	| {
			kind: "hit"
			time: number
			source: DamageSource
			notModeled: readonly string[]
			tick?: TickOwner
			laterHit?: TickOwner
			delayed?: TickOwner
	  }
	| { kind: "on-hit"; time: number }
	| { kind: "mark-applied"; time: number; mark: string; endsAt: number }
	/** `fromSituation`: a situation marker put the mark on the target. */
	| { kind: "mark-consumed"; time: number; mark: string; fromSituation?: true }
	| { kind: "expire"; time: number; effectId: string; holder: EffectHolder }
	| { kind: "expire"; time: number; mark: string }

/** An effect running at a moment, on the attacker or the target. */
export type ActiveEffect = {
	effectId: string
	holder: EffectHolder
	startedAt: number
	/** Infinity for one that lasts until its `endsOn` event (Teemo's W passive). */
	endsAt: number
	stacks: number
	/** Its most stacks, for an effect that has several (Conqueror's 12). */
	maxStacks?: number
	/** While its pause holds: the stat grants switched off, and until when (Viego's E movement speed). */
	paused?: { until: number; grants: readonly StatKey[] }
}

/**
 * An effect waiting in its `startsAfter` state before it runs (Ambush camouflaged): `from` when the
 * state starts while its `delay` still runs, and `until` when it runs out at the latest.
 */
export type WaitingEffect = {
	effectId: string
	label: string
	from?: number
	until: number
}

export type TargetMark = { mark: string; endsAt: number }

/** One tick of a damage over time: its time and damage, or why it has no number. */
export type DamageOverTimeTick =
	| { time: number; damage: DealtDamage }
	| { time: number; notModeled: readonly string[] }

/**
 * A damage over time a step applied (`applied`, `refreshed` or `stacked`, the first of its
 * applications there) and the ticks it owns: those no earlier application already covered, wherever
 * they land among the later steps. Additive by `effectId`, so steps can be summed.
 */
export type DamageOverTimeSummary = {
	effectId: string
	application: "applied" | "refreshed" | "stacked"
	/** Its stacks after the step's last application. */
	stacks: number
	ticks: DamageOverTimeTick[]
	/** When it runs out after the step's last application. */
	endsAt: number
	/** Its effect's delay, when the step's first application came after it ("detonates" at 3.45 s). */
	delayed?: { label: string; at: number }
}

/**
 * One item of the combo. An action owns what followed it until the next action started; a marker
 * owns no events and says what it did (`situation`).
 */
export type CombatStep = {
	action: CombatItem
	/** When it started (an attack waits for the attack timer, and lands at the end of its windup). */
	time: number
	situation?: SituationStatus
	/** The outcomes the build's effects can have at this action (`outcomeKeys`), and which happened. */
	outcomes: StepOutcome[]
	/** Why it did not run; the rest of the combo goes on. */
	refused?: string
	/**
	 * What followed until the next action started, in time order, and its cast's later hits. A tick
	 * here may belong to an earlier step (`tick.owner`); `damageOverTime` sums each step's own.
	 */
	events: CombatEvent[]
	/** The damage over time the step applied, with the ticks that belong to it. */
	damageOverTime: DamageOverTimeSummary[]
	/** The effects running and the marks on the target once the action resolved (a wait: at its end). */
	active: ActiveEffect[]
	/** The effects waiting in their `startsAfter` state then, or in the `delay` before it; absent: none. */
	waiting?: WaitingEffect[]
	marks: TargetMark[]
	/** The target's armor and magic resist then, after the reductions it holds; absent while it holds none. */
	resists?: Resists
	/** The target's health once the step's events are done, before the next action. */
	targetHealth: number
	/**
	 * A cast hitting again and again (`attackSpeedHits`): the hits that landed of those its full
	 * duration deals at its attack speed (Judgment 1.5 s: 3 of 7 spins).
	 */
	hits?: { count: number; of: number }
}

export type DamageTotals = { raw: number; final: number }

export type CombatResult = {
	steps: CombatStep[]
	/** Damage dealt over the whole combo, by type and in all. */
	total: DamageTotals
	byType: Record<DamageType, DamageTotals>
	/** When the target's health reached 0, and the step it fell in (its index, markers included). */
	kill?: { time: number; step: number }
	/**
	 * The combo's time: when its last damage landed, a burn's ticks after the last action included;
	 * never an effect running out or the idle time after the last hit. 0 without damage.
	 */
	duration: number
	/** When the last effect or mark still running ran out (Heightened Senses after the last hit). */
	activeUntil: number
}
