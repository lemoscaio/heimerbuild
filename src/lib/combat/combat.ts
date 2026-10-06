import type { AbilitySlot, DamageType } from "@schemas/champion"
import type { SummonerSlot } from "../summoner-slots"

/** One step of a combo: a basic attack, an ability of the current form, a summoner spell, or a wait. */
export type CombatAction =
	| { kind: "attack" }
	| { kind: "ability"; slot: AbilitySlot }
	| { kind: "summoner"; slot: SummonerSlot }
	| { kind: "wait"; seconds: number }

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

/** What dealt a hit: a basic attack, an ability's synced damage by name, or an effect (spellblade, Ignite). */
export type DamageSource =
	| { kind: "attack" }
	| { kind: "ability"; slot: AbilitySlot | "passive"; name: string }
	| { kind: "effect"; effectId: string }

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
	| { kind: "mark-consumed"; time: number; mark: string }
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

/** One action of the combo and what followed it, until the next one started. */
export type CombatStep = {
	action: CombatAction
	/** When it ran (an attack waits for the attack timer). */
	time: number
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
	/** When the target's health reached 0, and the step it fell in. */
	kill?: { time: number; step: number }
	/** Seconds from the first action until the last event (a burn ticking on). */
	duration: number
}
