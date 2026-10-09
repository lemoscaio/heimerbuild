import type { AbilitySlot } from "@schemas/champion"
import type { BuildEffect, DamageOverTimeGrant } from "../effects/effect"
import { type EffectContext, effectDuration } from "../effects/evaluate"
import { ticksInArea } from "./damage-over-time"
import type { TimeInArea } from "./registries/ability-hits"

/** An effect a cast of `slot` starts itself (`after-use`), which its time in the area sets. */
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

type AreaTicksQuery = {
	slot: AbilitySlot
	/** The build's effects (`combatEffects`), where the cast's own damage over time is. */
	effects: readonly BuildEffect[]
	context: EffectContext
}

/**
 * The ticks the cast's own damage over time deals for `seconds` in its area (`ticksInArea`), what
 * lingers after (`after`) included: "1 s · 3 ticks". None when the cast has no damage over time.
 */
export function areaTicks(
	seconds: number,
	{ after = 0 }: Pick<TimeInArea, "after">,
	{ slot, effects, context }: AreaTicksQuery,
): number | undefined {
	const own = effects.find(
		(effect) => isCastOwnEffect(effect, slot) && !!firstDamageOverTime(effect),
	)
	const timing = own && firstDamageOverTime(own)
	if (!own || !timing) return undefined
	const runs = seconds + after
	return ticksInArea(runs, effectDuration(own, context) ?? runs, timing)
}
