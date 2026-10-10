import type { Item } from "@schemas/item"
import type { MatchStackSource, StacksThreshold } from "./effects/effect"
import {
	type MatchStacks,
	reachesThreshold,
	stacksOf,
	withMatchStacks,
} from "./effects/match-stacks"
import { MANAFLOW_TRANSFORM } from "./effects/registries/item-effects"

/**
 * An item the game swaps for its upgrade, for free, once a match stack count reaches `at` (issue
 * 436). The build keeps the base item and the count; the upgrade is what it is in game.
 */
export type ItemUpgrade = {
	base: string
	upgrade: string
	at: StacksThreshold
	/** The count's name in the shop's label ("360 Manaflow"). */
	counter: string
}

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/** Wiki, checked 2026-10-09: Manamune and Archangel's Staff transform at 360 Manaflow bonus mana. */
export const ITEM_UPGRADES: readonly (ItemUpgrade & { sourceUrl: string })[] = [
	{
		base: "3004",
		upgrade: "3042",
		at: MANAFLOW_TRANSFORM,
		counter: "Manaflow",
		sourceUrl: `${WIKI}Muramana`,
	},
	{
		base: "3003",
		upgrade: "3040",
		at: MANAFLOW_TRANSFORM,
		counter: "Manaflow",
		sourceUrl: `${WIKI}Seraph%27s_Embrace`,
	},
]

/** The counts the build's base items wait for (Manamune's Manaflow): they stay with the item. */
export function upgradeSources(itemIds: readonly string[]): MatchStackSource[] {
	return ITEM_UPGRADES.filter(({ base }) => itemIds.includes(base)).map(
		({ at }) => at.source,
	)
}

/** The upgrade `itemId` is, by the upgrade's id (Muramana). */
export function upgradeRule(itemId: string): ItemUpgrade | undefined {
	return ITEM_UPGRADES.find(({ upgrade }) => upgrade === itemId)
}

type UpgradeItem = Pick<Item, "id" | "groupLimits">

/**
 * The build's items as they are in game: a base item whose count reached its upgrade's is the upgrade
 * (Manamune at 360 Manaflow is Muramana), with the base's group limits too, so the one-Manaflow-item
 * rule still holds. Every reader of the build's items goes through it; as given while the items load.
 */
export function effectiveItems<T extends UpgradeItem>(
	items: readonly T[],
	matchStacks: MatchStacks | undefined,
	itemsById: Readonly<Record<string, T>> | undefined,
): T[] {
	return items.map((item) => {
		const rule = ITEM_UPGRADES.find(({ base }) => base === item.id)
		const upgrade = rule && itemsById?.[rule.upgrade]
		if (!upgrade || !reachesThreshold(matchStacks, rule.at)) return item
		const own = new Set(upgrade.groupLimits.map(({ group }) => group))
		return {
			...upgrade,
			groupLimits: [
				...upgrade.groupLimits,
				...item.groupLimits.filter(({ group }) => !own.has(group)),
			],
		}
	})
}

export type BuildItemValues = {
	itemIds: readonly string[]
	matchStacks: MatchStacks | undefined
}

/**
 * The canonical form of the build's items: an upgrade's id (a link's `items=3042`, a shop pick) is its
 * base item with the count raised to the upgrade's, so a link always stores Manamune and the count.
 */
export function canonicalItemValues(values: BuildItemValues): BuildItemValues {
	if (!values.itemIds.some((id) => upgradeRule(id))) return values
	let stacks = values.matchStacks
	const itemIds = values.itemIds.map((id) => {
		const rule = upgradeRule(id)
		if (!rule) return id
		const { source, stacks: needed } = rule.at
		stacks = withMatchStacks(
			stacks,
			source.id,
			Math.max(stacksOf(stacks, source), needed),
		)
		return rule.base
	})
	return { itemIds, matchStacks: stacks }
}

/** "Upgrade of Manamune · 360 Manaflow" for an upgrade, by its base's name in this patch. */
export function upgradeLabel(
	itemId: string,
	itemsById: Readonly<Record<string, Pick<Item, "name">>> | undefined,
): string | undefined {
	const rule = upgradeRule(itemId)
	const base = rule && itemsById?.[rule.base]
	return (
		rule &&
		base &&
		`Upgrade of ${base.name} · ${rule.at.stacks} ${rule.counter}`
	)
}

/** Each upgrade's label in this patch, by its id: the shop's tiles. */
export function upgradeLabels(
	itemsById: Readonly<Record<string, Pick<Item, "name">>> | undefined,
): Readonly<Record<string, string>> {
	return Object.fromEntries(
		ITEM_UPGRADES.flatMap(({ upgrade }) => {
			const label = upgradeLabel(upgrade, itemsById)
			return label ? [[upgrade, label]] : []
		}),
	)
}
