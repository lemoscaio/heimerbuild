import type { AbilitySlot, DamageType } from "@schemas/champion"
import type { SummonerSlot } from "../summoner-slots"

/**
 * One step of a combo: a basic attack, an ability of the current form, a summoner spell, or a wait.
 * An ability may name the `variant` the player picked (Decimate's outer blade or inner handle).
 */
export type CombatAction =
	| { kind: "attack" }
	| { kind: "ability"; slot: AbilitySlot; variant?: string }
	| { kind: "summoner"; slot: SummonerSlot }
	| { kind: "wait"; seconds: number }

/** A point of the combo from which an effect's situation holds (Hail of Blades ready), by effect id. */
export type SituationMarker = { kind: "situation"; effectId: string }

/** What a combo is made of, in order: its actions and its situation markers. */
export type CombatItem = CombatAction | SituationMarker

/**
 * What a marker did. `forced`: the rules didn't allow it there (the effect's cooldown ran until
 * `readyAt`) and it applied anyway; `no-effect`: its situation already held, or the build lacks the
 * effect. `readyAt` on an applied one: when its cooldown had run out.
 */
export type SituationStatus =
	| { status: "applied"; readyAt?: number }
	| { status: "forced"; readyAt: number }
	| {
			status: "no-effect"
			reason: "already-marked" | "already-running" | "unavailable"
	  }

/**
 * A result the rules decide at a step, which free mode lets the user set: an effect empowering an
 * attack (Hail of Blades), a mark applied by a cast, a mark consumed.
 */
export type OutcomeKey =
	| { kind: "empowered"; effectId: string }
	| { kind: "mark-applied"; mark: string }
	| { kind: "mark-consumed"; mark: string }

/**
 * An outcome at a step and whether it happened; `charge` is the attack's place among an effect's
 * charges (Hail of Blades 2/3), `readyAt` when an effect that didn't empower it comes off cooldown.
 */
export type StepOutcome = OutcomeKey & {
	happened: boolean
	charge?: { used: number; max: number }
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

/** Everything that happens, in order; `time` is seconds from the combo's start. */
export type CombatEvent =
	| { kind: "cast"; time: number; source: CastSource }
	| { kind: "hit"; time: number; source: DamageSource; damage: DealtDamage }
	/** A hit the simulator has no number for, with why (a share of the target's health). */
	| {
			kind: "hit"
			time: number
			source: DamageSource
			notModeled: readonly string[]
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
}

export type TargetMark = { mark: string; endsAt: number }

/**
 * One item of the combo. An action owns what followed it until the next action started; a marker
 * owns no events and says what it did (`situation`).
 */
export type CombatStep = {
	action: CombatItem
	/** When it ran (an attack waits for the attack timer). */
	time: number
	situation?: SituationStatus
	/** The outcomes the build's effects can have at this action (`outcomeKeys`), and which happened. */
	outcomes: StepOutcome[]
	/** Why it did not run; the rest of the combo goes on. */
	refused?: string
	events: CombatEvent[]
	/** The effects running and the marks on the target once the action resolved (a wait: at its end). */
	active: ActiveEffect[]
	marks: TargetMark[]
	/** The target's health once the step's events are done, before the next action. */
	targetHealth: number
}

export type DamageTotals = { raw: number; final: number }

export type CombatResult = {
	steps: CombatStep[]
	/** Damage dealt over the whole combo, by type and in all. */
	total: DamageTotals
	byType: Record<DamageType, DamageTotals>
	/** When the target's health reached 0, and the step it fell in (its index, markers included). */
	kill?: { time: number; step: number }
	/** Seconds from the first action until the last event (a burn ticking on). */
	duration: number
}
