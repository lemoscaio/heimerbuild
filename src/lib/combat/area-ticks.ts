import type { AbilitySlot } from "@schemas/champion"
import type { BuildEffect, DamageOverTimeGrant } from "../effects/effect"
import { type EffectContext, effectDuration } from "../effects/evaluate"
import { ticksInArea } from "./damage-over-time"
import type { AbilityVariant } from "./registries/ability-hits"

/** A variant with the ticks its time in the area deals, when it sets one on a damage over time. */
export type AreaVariant = AbilityVariant & { ticks?: number }

/** An effect a cast of `slot` starts itself (`after-use`), which a variant's `duration` sets. */
export function isCastOwnEffect({ effect }: BuildEffect, slot: AbilitySlot) {
	return (
		effect.trigger.kind === "after-use" &&
		effect.source.kind === "ability" &&
		effect.source.slot === slot
	)
}

function firstDamageOverTime({ effect }: BuildEffect) {
	return effect.grants.find(
		(grant): grant is DamageOverTimeGrant => grant.kind === "damageOverTime",
	)
}

type AreaVariantsQuery = {
	slot: AbilitySlot
	/** The build's effects (`combatEffects`), where the cast's own damage over time is. */
	effects: readonly BuildEffect[]
	context: EffectContext
}

/** Each variant with its ticks (`ticksInArea`) on the cast's own damage over time: "1 s · 3 ticks". */
export function areaVariants(
	variants: readonly AbilityVariant[],
	{ slot, effects, context }: AreaVariantsQuery,
): AreaVariant[] {
	const own = effects.find(
		(effect) => isCastOwnEffect(effect, slot) && !!firstDamageOverTime(effect),
	)
	const timing = own && firstDamageOverTime(own)
	if (!own || !timing) return [...variants]
	return variants.map((variant) =>
		variant.duration === undefined
			? variant
			: {
					...variant,
					ticks: ticksInArea(
						variant.duration,
						effectDuration(own, context) ?? variant.duration,
						timing,
					),
				},
	)
}
