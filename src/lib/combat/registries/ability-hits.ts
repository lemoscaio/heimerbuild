import type { AbilitySlot } from "@schemas/champion"
import { isInPatchRange, type PatchRange } from "@schemas/patch-range"
import { ANNIE_HIT_RULES } from "../../champions/annie"
import { DARIUS_HIT_RULES } from "../../champions/darius"
import { EZREAL_HIT_RULES } from "../../champions/ezreal"
import { JANNA_HIT_RULES } from "../../champions/janna"
import { JINX_HIT_RULES } from "../../champions/jinx"
import { MAOKAI_HIT_RULES } from "../../champions/maokai"
import { MORGANA_HIT_RULES } from "../../champions/morgana"
import { NAUTILUS_HIT_RULES } from "../../champions/nautilus"
import { QUINN_HIT_RULES } from "../../champions/quinn"
import { SINGED_HIT_RULES } from "../../champions/singed"
import { TEEMO_HIT_RULES } from "../../champions/teemo"
import { VEIGAR_HIT_RULES } from "../../champions/veigar"
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
}

/** What a rule's variants pick, as the step's input says it: `text` beside them, `name` for assistive tech. */
export type VariantsLabel = { text: string; name: string }

/** Most variants say where the cast lands (Decimate's blade or handle). */
export const LANDS_LABEL: VariantsLabel = {
	text: "Lands",
	name: "How it lands",
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
	/** The hit applies on-hit effects like a basic attack: it spends a spellblade, detonates a mark. */
	onHit?: true
	/** The cast's damage is known not to be simulated, and why; the hit shows that instead of a number. */
	notModeled?: string
	/** The ways the cast can land, the first by default; each step picks one (an input, never an outcome). */
	variants?: readonly AbilityVariant[]
	/** What the variants pick, `LANDS_LABEL` when absent. */
	variantsLabel?: VariantsLabel
	/** Why the ability can't be cast at all (a passive only one): a cast is refused with it. */
	noCast?: string
	sourceUrl: string
}

/**
 * Checked on patch 16.19 for the curated champions (`CURATED_COMBAT_CHAMPIONS`); one file per
 * champion in `lib/champions/`.
 */
export const ABILITY_HIT_RULES: readonly AbilityHitRule[] = [
	...ANNIE_HIT_RULES,
	...DARIUS_HIT_RULES,
	...EZREAL_HIT_RULES,
	...JANNA_HIT_RULES,
	...JINX_HIT_RULES,
	...MAOKAI_HIT_RULES,
	...MORGANA_HIT_RULES,
	...NAUTILUS_HIT_RULES,
	...QUINN_HIT_RULES,
	...SINGED_HIT_RULES,
	...TEEMO_HIT_RULES,
	...VEIGAR_HIT_RULES,
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

/** What an ability's variants pick (`variantsLabel`), "Lands" by default. */
export function abilityVariantsLabel(
	query: HitRuleQuery,
	rules: readonly AbilityHitRule[] = ABILITY_HIT_RULES,
): VariantsLabel {
	return findHitRule(rules, query)?.variantsLabel ?? LANDS_LABEL
}
