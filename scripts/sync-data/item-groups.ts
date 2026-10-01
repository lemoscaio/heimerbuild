import type { Item } from "./schemas/item"

/**
 * Readable names of the purchase groups that hold several shop items, taken from their
 * members' CommunityDragon `keySecondaryBrief` (`Item_Unique_Lifeline`). `null`: not a shop
 * filter, because another group already covers the same items.
 */
export const ITEM_GROUP_LABELS: Readonly<Record<string, string | null>> = {
	Boots: "Boots",
	BootsWithoutActives: null, // Boots without the tier 3 boots
	DoransItems: "Starter",
	GoldItems: null, // jungle pets and support quest items, all in Starter
	HuntersTalismanGroup: "Jungle pet",
	Glory: "Glory",
	Potion: "Potion",
	LifelineItems: "Lifeline",
	TearItems: "Manaflow",
	LastWhisper: "Fatality",
	VoidPen: "Blight",
	ImmolateItems: "Immolate",
	Quicksilver: "Quicksilver",
	EternityItems: "Eternity",
	"{57352a0f}": "Spellblade",
	"{c6428663}": "Hydra",
	"{8c259571}": null, // three of the Hydra items
	"{548f93b0}": "Annul",
	"{d52cd27b}": null, // Bramble Vest and Thornmail, which builds from it
}

type LabelOptions = { labels?: Readonly<Record<string, string | null>> }

/**
 * Gives each group limit its label, and lists the groups of 2+ items that have no entry in
 * the labels, so a new purchase group fails the sync instead of staying unnamed.
 */
export function labelItemGroups(
	items: readonly Item[],
	{ labels = ITEM_GROUP_LABELS }: LabelOptions = {},
) {
	const members = new Map<string, string[]>()
	for (const item of items) {
		for (const { group } of item.groupLimits) {
			members.set(group, [...(members.get(group) ?? []), item.name])
		}
	}
	const unlabeled = [...members]
		.filter(
			([group, names]) => names.length > 1 && !Object.hasOwn(labels, group),
		)
		.map(([group, names]) => ({ group, names }))
	const labeled = items.map((item) => ({
		...item,
		groupLimits: item.groupLimits.map((limit) => {
			const label = Object.hasOwn(labels, limit.group)
				? labels[limit.group]
				: null
			return label ? { ...limit, label } : limit
		}),
	}))
	return { items: labeled, unlabeled }
}

export function formatUnlabeledGroups(
	unlabeled: readonly { group: string; names: readonly string[] }[],
) {
	return [
		"Item groups of several items without a label:",
		...unlabeled.map(({ group, names }) => `  ${group} (${names.join(", ")})`),
		"Name each one in ITEM_GROUP_LABELS (scripts/sync-data/item-groups.ts), or map it to null when another group covers it.",
	].join("\n")
}
