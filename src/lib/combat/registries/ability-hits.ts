import type { AbilitySlot } from "@schemas/champion"
import { isInPatchRange, type PatchRange } from "@schemas/patch-range"
import { AHRI_HIT_RULES } from "../../champions/ahri"
import { ANNIE_HIT_RULES } from "../../champions/annie"
import { BLITZCRANK_HIT_RULES } from "../../champions/blitzcrank"
import { BRAND_HIT_RULES } from "../../champions/brand"
import { DARIUS_HIT_RULES } from "../../champions/darius"
import { EZREAL_HIT_RULES } from "../../champions/ezreal"
import { GAREN_HIT_RULES } from "../../champions/garen"
import { JANNA_HIT_RULES } from "../../champions/janna"
import { JAX_HIT_RULES } from "../../champions/jax"
import { JINX_HIT_RULES } from "../../champions/jinx"
import { LEONA_HIT_RULES } from "../../champions/leona"
import { MAOKAI_HIT_RULES } from "../../champions/maokai"
import { MONKEY_KING_HIT_RULES } from "../../champions/monkey-king"
import { MORGANA_HIT_RULES } from "../../champions/morgana"
import { NASUS_HIT_RULES } from "../../champions/nasus"
import { NAUTILUS_HIT_RULES } from "../../champions/nautilus"
import { QUINN_HIT_RULES } from "../../champions/quinn"
import { RENGAR_HIT_RULES } from "../../champions/rengar"
import { SINGED_HIT_RULES } from "../../champions/singed"
import { TEEMO_HIT_RULES } from "../../champions/teemo"
import { VAYNE_HIT_RULES } from "../../champions/vayne"
import { VEIGAR_HIT_RULES } from "../../champions/veigar"
import { YORICK_HIT_RULES } from "../../champions/yorick"
import { ZAC_HIT_RULES } from "../../champions/zac"

/**
 * A way to land a cast the simulator can't know, which the player picks per step: Decimate's outer
 * blade or inner handle, how long the target stays in Poison Trail. `damage` replaces the rule's.
 */
export type AbilityVariant = {
	id: string
	label: string
	damage?: string | readonly string[]
	/** How long the cast's own effects (`after-use`) run instead of their duration: the time in its area. */
	duration?: number
	/** The cast hits the target `count` times, `every` seconds apart (Pyroclasm's bounces). */
	hits?: LaterHits
	/** The one a step without a pick gets, instead of the first (Pyroclasm's 3 hits). */
	default?: true
	/** Replaces the rule's `triggers` (Decimate's blade adds a Hemorrhage stack, its handle doesn't). */
	triggers?: string
}

/**
 * Each hit after the first deals the cast's damage again at its own time and triggers the `on-cast`
 * effects marked `perHit` (a Blaze stack); the step of the cast owns it.
 */
export type LaterHits = { count: number; every: number }

/**
 * Hits spread evenly over `over` seconds from the cast's: `base`, plus one per `perBonusAttackSpeed`
 * of bonus attack speed (Judgment: 7 spins, plus one per 25%, over 3 s).
 */
export type AttackSpeedHits = {
	base: number
	perBonusAttackSpeed: number
	over: number
}

/**
 * The cast can be cast `count` more times within `within` seconds of the first, `every` seconds
 * apart, before its cooldown (which starts at the first cast) holds it (Spirit Rush: 2 more in 15 s,
 * 1 s apart).
 */
export type Recasts = { count: number; within: number; every: number }

/**
 * The cast time shrinks in a straight line from the synced one, at no bonus attack speed, to `min`
 * at `fullAt` bonus attack speed and beyond (Zap!: 0.6 s to 0.4 s at 250%).
 */
export type AttackSpeedCastTime = { min: number; fullAt: number }

/** What a rule's variants pick, as the step's input says it: `text` beside them, `name` for assistive tech. */
export type VariantsLabel = { text: string; name: string }

/** Most variants say where the cast lands (Decimate's blade or handle). */
export const LANDS_LABEL: VariantsLabel = {
	text: "Lands",
	name: "How it lands",
}

/**
 * The cast empowers the champion's next basic attack, which the same step makes: the attack's hit
 * with the rule's damage as a bonus hit, as an attack (on-attack, on-hit, `endsOn: "attack"`).
 */
export type EmpoweredAttack = {
	/** The damage counts the attack's total attack damage too (Savagery's `QTotalDamage`): the bonus is the rest. */
	includesAttack?: true
	/** The cast resets the attack timer (wiki): the attack starts at once, even right after another's windup. */
	resetsAttack?: true
	/** The attack doesn't put the basic attack on cooldown (Shield of Daybreak): the next may start after its windup. */
	noAttackCooldown?: true
}

/**
 * How an ability's cast hits when its tooltip's first damage is not the whole story. Without a
 * rule, a cast deals the first damage of its tooltip (`damage`, synced).
 */
export type AbilityHitRule = PatchRange & {
	championKey: string
	slot: AbilitySlot
	/**
	 * The tooltip damage the cast deals, by name, or several dealt together (a base plus a share of
	 * the target's health); `null` deals none (an effect deals it, or nothing does in v1).
	 */
	damage?: string | readonly string[] | null
	/**
	 * The damage the cast deals instead while the target holds `effect` as the hit lands, before the
	 * cast's own effects (Pillar of Flame on an Ablaze target).
	 */
	whenTargetHas?: { effect: string; damage: string | readonly string[] }
	/** The hit applies on-hit effects like a basic attack: it spends a spellblade, detonates a mark. */
	onHit?: true
	/** The cast's damage is known not to be simulated, and why; the hit shows that instead of a number. */
	notModeled?: string
	/** The ways the cast can land, the first (or the one marked `default`) by default; each step picks one. */
	variants?: readonly AbilityVariant[]
	/** What the variants pick, `LANDS_LABEL` when absent. */
	variantsLabel?: VariantsLabel
	/** The cast is an empowered basic attack (Savagery, Siphoning Strike). */
	empowersAttack?: EmpoweredAttack
	/** The cast hits again and again, more with bonus attack speed (Judgment's spins). */
	attackSpeedHits?: AttackSpeedHits
	/** Why the ability can't be cast at all (a passive only one): a cast is refused with it. */
	noCast?: string
	/** Its recasts, which its cooldown doesn't refuse (Spirit Rush). */
	recasts?: Recasts
	/** The hit lands when the cast time ends, not as it starts (Decimate swings after its 0.75 s windup). */
	landsAtCastEnd?: true
	/** Its cast time by bonus attack speed (Zap!). */
	attackSpeedCastTime?: AttackSpeedCastTime
	/** An effect, by id, that each of its hits triggers once it lands (Condemn adds a Silver Bolts stack). */
	triggers?: string
	/**
	 * Each stack of the effect `effect` the target holds as the hit lands adds `bonus` of its damage
	 * (Noxian Guillotine: 20% per Hemorrhage stack, double at 5).
	 */
	perTargetStack?: { effect: string; bonus: number }
	/**
	 * The `on-action-damage` effects, by id, that count each of its hits as an action of its own
	 * instead of one per cast (wiki Conqueror: Judgment stacks it "for every tick of damage").
	 */
	actionPerHit?: readonly string[]
	sourceUrl: string
}

/**
 * Checked on patch 16.19 for the curated champions (`CURATED_COMBAT_CHAMPIONS`), and for any
 * champion's variants and empowered attacks; one file per champion in `lib/champions/`.
 */
export const ABILITY_HIT_RULES: readonly AbilityHitRule[] = [
	...AHRI_HIT_RULES,
	...ANNIE_HIT_RULES,
	...BLITZCRANK_HIT_RULES,
	...BRAND_HIT_RULES,
	...DARIUS_HIT_RULES,
	...EZREAL_HIT_RULES,
	...GAREN_HIT_RULES,
	...JANNA_HIT_RULES,
	...JAX_HIT_RULES,
	...JINX_HIT_RULES,
	...LEONA_HIT_RULES,
	...MAOKAI_HIT_RULES,
	...MONKEY_KING_HIT_RULES,
	...MORGANA_HIT_RULES,
	...NASUS_HIT_RULES,
	...NAUTILUS_HIT_RULES,
	...QUINN_HIT_RULES,
	...RENGAR_HIT_RULES,
	...SINGED_HIT_RULES,
	...TEEMO_HIT_RULES,
	...VAYNE_HIT_RULES,
	...VEIGAR_HIT_RULES,
	...YORICK_HIT_RULES,
	...ZAC_HIT_RULES,
]

type HitRuleQuery = { championKey: string; patch: string; slot: AbilitySlot }

/** The rule of a champion's ability in force on the patch, if it has one. */
export function findHitRule(
	rules: readonly AbilityHitRule[],
	{ championKey, patch, slot }: HitRuleQuery,
): AbilityHitRule | undefined {
	return rules.find(
		(rule) =>
			rule.championKey === championKey &&
			rule.slot === slot &&
			isInPatchRange(patch, rule),
	)
}

/** The ways an ability's cast can land (`variants`), none when the simulator needs no choice. */
export function abilityVariants(
	query: HitRuleQuery,
	rules: readonly AbilityHitRule[] = ABILITY_HIT_RULES,
): readonly AbilityVariant[] {
	return findHitRule(rules, query)?.variants ?? []
}

/** The variant a step without a pick gets: the one marked `default`, else the first. */
export function defaultVariant(
	variants: readonly AbilityVariant[],
): AbilityVariant | undefined {
	return variants.find((variant) => variant.default) ?? variants[0]
}

/** What an ability's variants pick (`variantsLabel`), "Lands" by default. */
export function abilityVariantsLabel(
	query: HitRuleQuery,
	rules: readonly AbilityHitRule[] = ABILITY_HIT_RULES,
): VariantsLabel {
	return findHitRule(rules, query)?.variantsLabel ?? LANDS_LABEL
}
