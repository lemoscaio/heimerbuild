import type { BuildValues } from "@/features/build-calculator/types/build-source"
import { usesCurrentHealth } from "@/lib/effects/current-health"
import type { BuildEffect } from "@/lib/effects/effect"
import { usesGameTime } from "@/lib/effects/game-time"
import { usedMatchStacks } from "@/lib/effects/match-stacks"
import { upgradeSources } from "@/lib/item-upgrades"

function isUsed(
	effects: readonly BuildEffect[],
	uses: (effect: BuildEffect["effect"]) => boolean,
): boolean {
	return effects.some(({ effect }) => uses(effect))
}

/**
 * The build's values without the condition values (current health, game time, each source's match
 * stacks) that no available effect uses, like a link's choice for an effect the build lacks. As given while the effects load.
 */
export function dropUnusedConditionValues(
	values: BuildValues,
	effects: readonly BuildEffect[] | undefined,
): BuildValues {
	if (!effects) return values
	return {
		...values,
		currentHealth: isUsed(effects, usesCurrentHealth)
			? values.currentHealth
			: undefined,
		gameTime: isUsed(effects, usesGameTime) ? values.gameTime : undefined,
		// The count an item's upgrade waits for stays even when no effect reads it (Garen's Muramana).
		matchStacks: usedMatchStacks(
			values.matchStacks,
			effects.map(({ effect }) => effect),
			{ alsoRead: upgradeSources(values.itemIds) },
		),
	}
}
