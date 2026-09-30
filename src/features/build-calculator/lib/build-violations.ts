import type { Item } from "@schemas/item"

type BuildItem = Pick<Item, "id" | "name" | "groupLimits">

export type BuildViolation = {
	/** CommunityDragon group id, often a hash like `{0321bdeb}`: never show it. */
	group: string
	max: number
	/** The build's items in the group, copies included, in slot order. */
	itemIds: string[]
	/** Why the game refuses this build, e.g. "only 1 boots item (Berserker's Greaves, Sorcerer's Shoes)". */
	message: string
}

// When several groups flag the same items, the earlier label wins.
const GROUP_LABELS: readonly (readonly [group: string, label: string])[] = [
	["Boots", "boots item"],
	["BootsWithoutActives", "boots item"],
	["HuntersTalismanGroup", "jungle companion"],
	["DoransItems", "Doran's item"],
	["APMultiplier", "AP-multiplier item"],
	["LifelineItems", "lifeline item"],
	["TearItems", "Tear item"],
	["VoidPen", "Void penetration item"],
	["LastWhisper", "Last Whisper item"],
	["ImmolateItems", "Immolate item"],
	["Quicksilver", "Quicksilver item"],
	["Potion", "potion"],
]

/** Every item group limit the build breaks, one entry per distinct set of items. */
export function findBuildViolations(
	items: readonly BuildItem[],
): BuildViolation[] {
	const groups = new Map<string, { max: number; members: BuildItem[] }>()
	for (const item of items) {
		for (const { group, max } of item.groupLimits) {
			const entry = groups.get(group) ?? { max, members: [] }
			entry.members.push(item)
			groups.set(group, entry)
		}
	}

	// Boots and BootsWithoutActives flag the same two boots: say it once.
	const byItems = new Map<string, BuildViolation & { rank: number }>()
	for (const [group, { max, members }] of groups) {
		if (members.length <= max) continue
		const itemIds = members.map(({ id }) => id)
		const key = itemIds.join(",")
		const candidate = { group, max, itemIds, ...describe(group, max, members) }
		const kept = byItems.get(key)
		if (!kept || candidate.rank < kept.rank) byItems.set(key, candidate)
	}
	return [...byItems.values()].map(({ rank: _rank, ...violation }) => violation)
}

function describe(group: string, max: number, members: readonly BuildItem[]) {
	const labelIndex = GROUP_LABELS.findIndex(([name]) => name === group)
	const isOneItem = new Set(members.map(({ id }) => id)).size === 1
	if (labelIndex === -1 && isOneItem) {
		return { rank: 0, message: `only ${max} ${members[0].name}` }
	}
	const names = listNames(members)
	if (labelIndex !== -1) {
		const label = GROUP_LABELS[labelIndex][1]
		return { rank: 1 + labelIndex, message: `only ${max} ${label} (${names})` }
	}
	return {
		rank: 1 + GROUP_LABELS.length,
		message:
			max === 1
				? `these items can't be combined (${names})`
				: `only ${max} of these items (${names})`,
	}
}

function listNames(members: readonly BuildItem[]) {
	const counts = new Map<string, number>()
	for (const { name } of members) counts.set(name, (counts.get(name) ?? 0) + 1)
	return [...counts]
		.map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
		.join(", ")
}
