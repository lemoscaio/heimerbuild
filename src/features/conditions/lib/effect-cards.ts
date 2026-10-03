import type { Condition } from "./conditions"

/** The effects of one source shown together: an ability's passive and active share a card. */
export type EffectCard = {
	key: string
	/** "Move Quick (W)" for an ability, the source's name otherwise. */
	title: string
	icon: string
	conditions: Condition[]
}

function cardOf({ effect }: Condition): Omit<EffectCard, "conditions"> {
	return effect.slot
		? {
				key: `ability-${effect.slot}`,
				title: `${effect.name} (${effect.slot})`,
				icon: effect.icon,
			}
		: { key: effect.id, title: effect.name, icon: effect.icon }
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
