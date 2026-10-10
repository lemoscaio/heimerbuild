import type { BuildEffect, MatchStackSource } from "@/lib/effects/effect"
import { ITEM_UPGRADES } from "@/lib/item-upgrades"
import type { Condition } from "./conditions"

/** The effects of one source shown together: an ability's passive and active share a card. */
export type EffectCard = {
	key: string
	/** "Move Quick (W)" for an ability, the source's name otherwise. */
	title: string
	icon: string
	conditions: Condition[]
}

/** The base item of an item that transforms, or of its upgrade (Manamune for Muramana). */
function upgradeBase({ effect: { source } }: BuildEffect): string | undefined {
	if (source.kind !== "item") return undefined
	return ITEM_UPGRADES.find(
		({ base, upgrade }) => source.itemId === base || source.itemId === upgrade,
	)?.base
}

function cardOf({ effect }: Condition): Omit<EffectCard, "conditions"> {
	if (effect.slot) {
		return {
			key: `ability-${effect.slot}`,
			title: `${effect.name} (${effect.slot})`,
			icon: effect.icon,
		}
	}
	// One card through a transformation (Manamune to Muramana at 360), so its input keeps focus.
	const base = upgradeBase(effect)
	const key = base ? `item-${base}` : effect.id
	return { key, title: effect.name, icon: effect.icon }
}

/** A row's key: the stack inputs it carries, which stay as its effect changes into the upgrade's. */
export function conditionKey(
	{ effect }: Condition,
	inputSources: readonly MatchStackSource[],
): string {
	return inputSources.length
		? `stacks-${inputSources.map(({ id }) => id).join(".")}`
		: effect.id
}

/** The conditions grouped into cards by source ability, in list order; other effects get a card each. */
export function effectCards(conditions: readonly Condition[]): EffectCard[] {
	const cards = new Map<string, EffectCard>()
	for (const condition of conditions) {
		const card = cardOf(condition)
		const existing = cards.get(card.key)
		if (existing) existing.conditions.push(condition)
		else cards.set(card.key, { ...card, conditions: [condition] })
	}
	return [...cards.values()]
}
