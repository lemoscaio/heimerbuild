import type { AbilitySlot, RankStat } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { SummonerSpell } from "@schemas/summoner-spell"

/** Where an effect comes from, by the key the patch data uses. */
export type EffectSource =
	| { kind: "ability"; championKey: string; slot: AbilitySlot }
	| { kind: "summoner"; spellKey: string }
	| { kind: "rune"; runeKey: string }
	| { kind: "item"; itemId: string }

/** `value` from `from` seconds of cooldown up to the next bracket's `from`. */
export type CooldownBracket = { from: number; value: number }

/**
 * A fixed number, or a table read at the build's state: `level` is the summoner spell's synced
 * value by champion level, `rank` the ability's rank stat by its rank, `summonerCooldown` the
 * bracket the spell's cooldown falls into. `scale` converts the game value to the stat's unit.
 */
export type Amount =
	| number
	| { by: "level"; value: string; scale?: number }
	| { by: "rank"; rankStat: RankStat["stat"]; scale?: number }
	| { by: "summonerCooldown"; brackets: readonly CooldownBracket[] }

export type DamageType = "physical" | "magic" | "true"

/** Damage as ratios of the attacker's stats: 2 base AD is 200% of base attack damage. */
export type DamageRatios = Partial<
	Record<"baseAttackDamage" | "abilityPower", number>
>

/** Stats fold into the totals; shields and heals are values of their own; damage waits for the combo timeline. */
export type Grant =
	| { kind: "stat"; stat: StatKey; amount: Amount }
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

/** A conditional effect as typed, sourced data: what it grants, when, for how long. */
export type Effect = {
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
	/** The page the numbers were checked against. */
	sourceUrl: string
}

/** An effect the build can turn on, bound to the data its amounts read. */
export type BuildEffect = {
	/** The id in links: the effect's, plus the cast spell for one any summoner spell triggers ("nimbus-cloak-flash"). */
	id: string
	effect: Effect
	/** The source's name and icon in this patch. */
	name: string
	icon: string
	/** The ability whose rank the `rank` amounts read. */
	slot?: AbilitySlot
	/** The spell the `level` and `summonerCooldown` amounts read: the source, or the one cast. */
	spell?: SummonerSpell
}

/** The user's choices that differ from each effect's default, by `BuildEffect.id`. */
export type EffectOverrides = Readonly<Record<string, boolean>>
