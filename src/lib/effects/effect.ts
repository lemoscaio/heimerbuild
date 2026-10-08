import type {
	AbilityRankValue,
	AbilitySlot,
	RankStat,
	TargetHealth,
} from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { PatchRange } from "@schemas/patch-range"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { StatName } from "../stats/compute-stats"

/** Where an effect comes from, by the key the patch data uses; an ability's passive has no rank. */
export type EffectSource =
	| { kind: "ability"; championKey: string; slot: AbilitySlot | "passive" }
	| { kind: "summoner"; spellKey: string }
	| { kind: "rune"; runeKey: string }
	| { kind: "item"; itemId: string }

/** `value` from `from` seconds of cooldown up to the next bracket's `from`. */
export type CooldownBracket = { from: number; value: number }

/** `value` from champion level `from` up to the next step's `from`. */
export type LevelStep = { from: number; value: number }

/**
 * A fixed number, or a table read at the build's state: `level` is the summoner spell's synced
 * value by champion level, `rank` the ability's rank stat by its rank, `rankValue` the ability's
 * synced tooltip line by its rank, `summonerCooldown` the bracket the spell's cooldown falls into,
 * `championLevel` the step the champion's level reached (Jayce's Hammer Stance: 5 to 26 at 1/6/11/16).
 * `scale` converts the game value to the stat's unit.
 */
export type TableAmount =
	| number
	| { by: "level"; value: string; scale?: number }
	| { by: "rank"; rankStat: RankStat["stat"]; scale?: number }
	| RankValueAmount
	| { by: "summonerCooldown"; brackets: readonly CooldownBracket[] }
	| { by: "championLevel"; steps: readonly LevelStep[] }

/**
 * The ability's synced tooltip line `label` at its rank. With `slot`, another ability's line at
 * that ability's rank, and `unranked` while it has no point: an ultimate that upgrades a basic
 * ability (GNAR! raises Hyper's 20% speed to 40 / 60 / 80%).
 */
export type RankValueAmount = {
	by: "rankValue"
	label: AbilityRankValue["label"]
	scale?: number
	slot?: AbilitySlot
	unranked?: number
}

/**
 * A table amount, or one that reads the build beyond it: `stat` is `ratio` of another stat's total
 * (its bonus part with `part: "bonus"`) before the stat-dependent bonuses (evaluation step 4);
 * `missingHealth` grows from 0 at full health to `max` at `fullAt` percent missing health, read from
 * the current health condition;
 * `gameTime` grows every `every` minutes of the game time condition (see `GameTimeAmount`);
 * `statDecay` shrinks as a stat grows (see `StatDecayAmount`);
 * `attackType` is one value for melee and another for ranged (Hail of Blades: 90% and 60%).
 */
export type Amount =
	| TableAmount
	| {
			by: "stat"
			stat: StatName
			part?: "bonus"
			ratio: TableAmount | MissingHealthAmount
	  }
	| MissingHealthAmount
	| GameTimeAmount
	| StatDecayAmount
	| { by: "attackType"; melee: TableAmount; ranged: TableAmount }

/**
 * Grows from 0 at full health to `max` at `fullAt` percent missing health. As a `stat` ratio, a
 * share of missing health: Olaf's 17.5% of missing health, up to 70% missing, is the health × it.
 */
export type MissingHealthAmount = {
	by: "missingHealth"
	max: TableAmount
	fullAt: number
}

/**
 * `base` × `factor` ^ (the stat's total ÷ `per`): Harrier's cooldown is 7 × 0.99 per 1% critical
 * strike chance (`per: 0.01`), 7 s down to 2.56 s.
 */
export type StatDecayAmount = {
	by: "statDecay"
	stat: StatName
	base: number
	factor: number
	per: number
}

/**
 * Grows once per full `every` minutes. `triangular`: step n adds n × `step`, so the total after n
 * steps is `step` × n(n+1)/2 (Gathering Storm: 8, 24, 48, 80 AP).
 */
export type GameTimeAmount = {
	by: "gameTime"
	every: number
	growth: "triangular"
	step: TableAmount
}

export type DamageType = "physical" | "magic" | "true"

/** Damage as ratios of the attacker's stats: 2 base AD is 200% of base attack damage. */
export type DamageRatios = Partial<
	Record<"baseAttackDamage" | "bonusAttackDamage" | "abilityPower", number>
>

/** A stat, or Adaptive Force: AD or AP by the build's adaptive type, like the stat shards. */
export type GrantStat = StatKey | "adaptiveForce"

/**
 * What one tick of a damage over time deals: an amount (Ignite: a fifth of the spell's total), the
 * source ability's synced formula by name times `scale` (Toxic Shot: `TotalDotDamage` ÷ 4), or a
 * `ratio` of the target's health when the tick lands (Liandry's Torment: 1% of its maximum).
 */
export type TickDamage =
	| { by: "amount"; damageType: DamageType; amount: Amount }
	| {
			by: "abilityDamage"
			ability: AbilitySlot | "passive"
			name: string
			scale: number
	  }
	| {
			by: "targetHealth"
			damageType: DamageType
			health: TargetHealth
			ratio: number
	  }

/**
 * A damage dealt every `every` seconds while its effect runs, each tick at its own time. The first
 * lands at the application (Ignite: 0 to 4.224 s of 5), or `delayed` one `every` later, the last at
 * the end (Toxic Shot: 1 to 4 s of 4). A refresh keeps the tick timer; each stack adds one tick's damage.
 */
export type DamageOverTimeGrant = {
	kind: "damageOverTime"
	tick: TickDamage
	every: number
	firstTick?: "delayed"
	/** Up to this share more as the target's missing health grows to 100% (Tormented Shadow: 1). */
	missingHealthBonus?: number
}

/** A resistance of the target, as the mitigation reads it. */
export type Resist = "armor" | "magicResist"

/**
 * Lowers the target's armor or magic resist while its effect runs, held by the target (combat
 * simulator): `flat` points (Rengar's R: 15 to 25) or a `percent` share (Black Cleaver: 0.3 at 5
 * stacks). Mitigation applies it before the attacker's penetration.
 */
export type ResistReductionGrant = {
	kind: "resistReduction"
	resist: Resist
	mode: "flat" | "percent"
	amount: Amount
}

/**
 * Multiplies the cooldown of a cast of one of `slots` while its effect runs, after ability haste
 * (combat simulator): Fury of the Sands halves Siphoning Strike's (0.5).
 */
export type CooldownMultiplierGrant = {
	kind: "cooldownMultiplier"
	slots: readonly AbilitySlot[]
	amount: Amount
}

/**
 * Stats fold into the totals; an attack speed multiplier scales the bonus or total attack speed
 * after them; shields and heals are values of their own. The damage grants are the combat
 * simulator's (`lib/combat`): `damage` as ratios of the attacker's stats, `abilityDamage` as the
 * source ability's synced formula by name, `damageOverTime` in ticks while it lasts,
 * `onAttackDamage` by each basic attack while it runs (`base` plus `ratios`: Hail of Blades' true
 * damage); so are `resistReduction`, on the target, and `cooldownMultiplier`.
 */
export type Grant = GrantTiming &
	(
		| { kind: "stat"; stat: GrantStat; amount: Amount }
		| { kind: "attackSpeedMultiplier"; of: "bonus" | "total"; amount: Amount }
		| { kind: "shield"; amount: Amount }
		| { kind: "heal"; amount: Amount }
		| { kind: "damage"; damageType: DamageType; ratios: DamageRatios }
		| { kind: "abilityDamage"; ability: AbilitySlot | "passive"; name: string }
		| DamageOverTimeGrant
		| {
				kind: "onAttackDamage"
				damageType: DamageType
				base?: TableAmount
				ratios: DamageRatios
		  }
		| ResistReductionGrant
		| CooldownMultiplierGrant
	)

/**
 * A grant's own clock inside its effect: it ends `duration` seconds after the trigger (Olaf's shield,
 * 2.5 s of 5), and `decay` shrinks it linearly to `to` (0 by default) over `over` seconds (its
 * duration by default, else its effect's), then holds (Overdrive: to 10% over 2.9 s of 5).
 */
export type GrantTiming = {
	duration?: Amount
	decay?: { over?: Amount; to?: Amount }
}

/** A state the champion holds while the effect lasts. */
export type EffectCondition = "not-damaged-recently"

/**
 * When an effect starts. `on-attack`, `on-cast`, `on-mark-consumed`, `periodic`,
 * `on-ability-damage`, `on-damage` and `on-max-stacks` exist only in the combat simulator: a basic
 * attack starting, before its hit (Hail of Blades); a cast of one of `slots` (any ability without
 * them; `perHit`: each later hit of the cast too, Pyroclasm's bounces); the attacker consuming
 * `mark` on the target; on its own once its cooldown is over, while it isn't running and its mark
 * has been off the target for `idle` seconds (Valor's Harrier, Ziggs's Short Fuse); an ability's
 * damage landing, its ticks included (Liandry's Torment); damage of `damageType` landing, from any
 * source, once per moment (Black Cleaver's Carve); or the `effect` with that id reaching its
 * `stacks.max` (Blaze's detonation at 3 stacks).
 */
export type Trigger =
	| { kind: "always" }
	| { kind: "while"; condition: EffectCondition }
	| { kind: "after-use" }
	| { kind: "after-summoner" }
	| { kind: "on-hit" }
	| { kind: "after-ability" }
	| { kind: "on-attack" }
	| { kind: "on-cast"; slots?: readonly AbilitySlot[]; perHit?: true }
	| { kind: "on-mark-consumed"; mark: string }
	| { kind: "periodic"; idle?: number }
	| { kind: "on-ability-damage" }
	| { kind: "on-max-stacks"; effect: string }
	| { kind: "on-damage"; damageType: DamageType }

export type TriggerKind = Trigger["kind"]

/**
 * How effects of one group combine; effects without a group add up. `replace`: the highest
 * `priority` applies; `highest`: the largest value; `unique`: one of them, once.
 */
export type Stacking =
	| { group: string; rule: "replace"; priority: number }
	| { group: string; rule: "highest" | "unique" }

export type StackingRule = Stacking["rule"]

/** What consumes a mark on the target: a basic attack, or an ability's hit. */
export type MarkConsumer = "attack" | "ability"

/** A mark the effect puts on the target for `duration` seconds (Quinn's Harrier, Ezreal's Essence Flux). */
export type MarkApplication = {
	mark: string
	duration: number
	consumedBy: readonly MarkConsumer[]
}

/** A cast of one of these abilities only (Ambush's camouflage breaks on Venom Cask and Contaminate). */
export type SlotCast = { kind: "cast"; slots: readonly AbilitySlot[] }

/**
 * What ends an effect early: Teemo's W passive stops when he takes damage; Rengar's R when he
 * attacks or casts (a list ends on any of them; `SlotCast` for only some abilities); a spellblade
 * on the next on-hit, which deals its damage and uses it up.
 */
export type EndsOn = "damage-taken" | "attack" | "cast" | "on-hit" | SlotCast

/** What starts a pause (combat simulator): a basic attack, an ability cast. */
export type PauseOn = Extract<EndsOn, "attack" | "cast">

/** What breaks a state an effect waits in (combat simulator): a basic attack, an ability cast (or only some). */
export type BreakOn = Extract<EndsOn, "attack" | "cast"> | SlotCast

/**
 * Sets the running effect `effect` to `stacks` stacks and refreshes it (starts it when not running),
 * and while the resetting effect runs that effect stacks no higher (Blaze's detonation: one stack,
 * no more for 4 s).
 */
export type StackReset = { effect: string; stacks: number }

/**
 * A state the effect waits in before it runs (combat simulator): from its trigger (after its
 * `delay`) for `duration`, or until one of `endsOn` breaks it; then its grants and duration start
 * (Ambush's attack speed once the camouflage breaks). `label` names the state on a step
 * ("camouflaged"); `ending` names its end on the panel's row ("camouflage breaks").
 */
export type StartsAfter = {
	label: string
	ending: string
	duration: Amount
	endsOn: readonly BreakOn[]
	/** What ends the state without running it (Rengar's R: a cast of W or E, no leap). */
	dropsOn?: readonly BreakOn[]
	/** Only a break starts it; running out drops it (no leap out of Rengar's R, no armor reduction). */
	needsBreak?: true
}

/**
 * Part of an effect switched off for `seconds` after each of `on`, then back on, while the rest
 * holds (Viego's E: its movement speed for 1 s after an attack or a cast; its attack speed stays).
 */
export type EffectPause = {
	on: readonly PauseOn[]
	/** The stat grants it switches off, by stat. */
	grants: readonly StatKey[]
	seconds: number
}

/**
 * A situation a combo marker can set, which the effect supports (combat simulator): its mark on
 * the target (`marked`: Harrier), the effect running (`running`: Short Fuse ready), or its cooldown
 * over so its trigger fires next (`ready`: Hail of Blades ready).
 */
export type StartOption =
	| { kind: "marked" }
	| { kind: "running" }
	| { kind: "ready" }

/**
 * When its cooldown starts: when it triggers (absent), when its `endsOn` ends it, when its mark
 * leaves the target (`mark-end`: consumed, expired or overwritten; Harrier's is "post-effect"), or
 * when it ends in any way (`end`: its charges used or its duration over; Hail of Blades).
 */
export type CooldownFrom = "mark-end" | "end"

/**
 * A conditional effect as typed, sourced data: what it grants, when, for how long. `since` is the
 * patch its numbers were checked on; a change in a later patch is a new entry with the same id.
 */
export type Effect = PatchRange & {
	/** Readable and stable: build links carry it ("ghost", "teemo-w-passive"). */
	id: string
	source: EffectSource
	grants: readonly Grant[]
	trigger: Trigger
	/** Seconds it lasts once triggered. */
	duration?: Amount
	/**
	 * It takes effect `seconds` after its trigger, all of it then: damage, duration, ticks, marks
	 * (Noxious Trap arms for 1 s). `label` names that moment on its step ("detonates").
	 */
	delay?: { seconds: number; label: string }
	/** Seconds before it can trigger again. */
	cooldown?: Amount
	/** When the cooldown starts, if not when it triggers or ends (`endsOn`). */
	cooldownFrom?: CooldownFrom
	/** Seconds its cooldown loses whenever the champion casts an ability (Short Fuse: 4 to 6). */
	reducedOnCast?: Amount
	/** The situation a combo marker can set with it, which the Combo tab offers. */
	start?: StartOption
	/**
	 * Each new application adds one up to `max`: stats scale by stacks / max, a damage over time ticks
	 * once per stack. With `onlyAtMax`, its grants hold only at `max` (Vi's attack speed after 3 hits).
	 */
	stacks?: { max: number; onlyAtMax?: true }
	/**
	 * The basic attacks it holds for, then it ends: an `on-attack` one's include the attack that
	 * triggers it (Hail of Blades); a re-trigger gives them back (Monk Training after each cast).
	 */
	charges?: number
	/** What ends it early; its `cooldown` then starts from that moment instead of the trigger. */
	endsOn?: EndsOn | readonly EndsOn[]
	/** Part of it an event switches off for a while, the rest holding (combat simulator). */
	pauses?: EffectPause
	/** A state it waits in, which an event breaks or which runs out, before it runs (combat simulator). */
	startsAfter?: StartsAfter
	/** The mark it puts on the target when it triggers (combat simulator). */
	applies?: MarkApplication
	/** Another effect's stacks it sets when it takes effect, and caps while it runs (combat simulator). */
	resets?: StackReset
	/** Who holds it: the attacker (absent), or the target (Ignite's burn, Toxic Shot's poison). */
	holder?: "target"
	/** Replaces the trigger's default (`isOnByDefault`). */
	defaultOn?: boolean
	/** Replaces the trigger's listing (`isListed`): a combat trigger's effect with a switch too (Heightened Senses). */
	listed?: boolean
	/** Its stacking group; absent means it adds to every other effect. */
	stacking?: Stacking
	/** The part of its source it is, when the source has several (Teemo's W passive and active). */
	part?: "passive" | "active"
	/** The champion form it holds in, by form id ("dragon"); absent means every form. */
	form?: string
	/** Its row's name in the Effects list when neither the part nor the form says it ("Rev'd up"). */
	label?: string
	/** The page the numbers were checked against. */
	sourceUrl: string
}

/** An ability's name and synced tooltip lines, as an effect reads them. */
export type EffectAbilityLines = {
	name: string
	rankValues?: readonly AbilityRankValue[]
}

/** An effect the build can turn on, bound to the data its amounts read. */
export type BuildEffect = {
	/** The id in links: the effect's, plus the cast spell for one any summoner spell triggers ("nimbus-cloak-flash"). */
	id: string
	effect: Effect
	/** The source's name and icon in this patch. */
	name: string
	icon: string
	/** The ability whose rank the `rank` and `rankValue` amounts read; absent for a passive's. */
	slot?: AbilitySlot
	/** That ability's synced tooltip lines, which `rankValue` amounts read. */
	rankValues?: readonly AbilityRankValue[]
	/** The other abilities whose lines and rank its `rankValue` amounts read, by slot (GNAR! for Hyper). */
	boosts?: Partial<Record<AbilitySlot, EffectAbilityLines>>
	/** The spell the `level` and `summonerCooldown` amounts read: the source, or the one cast. */
	spell?: SummonerSpell
	/** The name of the form it holds in ("Dragon"), for an effect bound to one. */
	formName?: string
}

/** The user's choices that differ from each effect's default, by `BuildEffect.id`. */
export type EffectOverrides = Readonly<Record<string, boolean>>
