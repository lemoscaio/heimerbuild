import type { AbilityRankValue, AbilitySlot, RankStat } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { PatchRange } from "@schemas/patch-range"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { StatName } from "../stats/compute-stats"

/** Where an effect comes from, by the key the patch data uses. */
export type EffectSource =
	| { kind: "ability"; championKey: string; slot: AbilitySlot }
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
 * `gameTime` grows every `every` minutes of the game time condition (see `GameTimeAmount`).
 */
export type Amount =
	| TableAmount
	| { by: "stat"; stat: StatName; part?: "bonus"; ratio: TableAmount }
	| { by: "missingHealth"; max: TableAmount; fullAt: number }
	| GameTimeAmount

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
	Record<"baseAttackDamage" | "abilityPower", number>
>

/** A stat, or Adaptive Force: AD or AP by the build's adaptive type, like the stat shards. */
export type GrantStat = StatKey | "adaptiveForce"

/**
 * Stats fold into the totals; an attack speed multiplier scales the bonus or total attack speed
 * after them; shields and heals are values of their own; damage waits for the combo timeline.
 */
export type Grant =
	| { kind: "stat"; stat: GrantStat; amount: Amount }
	| { kind: "attackSpeedMultiplier"; of: "bonus" | "total"; amount: Amount }
	| { kind: "shield"; amount: Amount }
	| { kind: "heal"; amount: Amount }
	| { kind: "damage"; damageType: DamageType; ratios: DamageRatios }

/** A state the champion holds while the effect lasts. */
export type EffectCondition = "not-damaged-recently"

export type Trigger =
	| { kind: "always" }
	| { kind: "while"; condition: EffectCondition }
	| { kind: "after-use" }
	| { kind: "after-summoner" }
	| { kind: "on-hit" }
	| { kind: "after-ability" }

export type TriggerKind = Trigger["kind"]

/**
 * How effects of one group combine; effects without a group add up. `replace`: the highest
 * `priority` applies; `highest`: the largest value; `unique`: one of them, once.
 */
export type Stacking =
	| { group: string; rule: "replace"; priority: number }
	| { group: string; rule: "highest" | "unique" }

export type StackingRule = Stacking["rule"]

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
	/** Seconds before it can trigger again. */
	cooldown?: Amount
	stacks?: { max: number }
	/** What ends it early: Teemo's W passive stops when he takes damage. */
	endsOn?: "damage-taken"
	/** Replaces the trigger's default (`isOnByDefault`). */
	defaultOn?: boolean
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
	/** The ability whose rank the `rank` and `rankValue` amounts read. */
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
