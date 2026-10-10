import { z } from "zod"

const SUMMONERS_RIFT = "11"
const CLASSIC_MODE = "Maps/Shipping/Map11/Modes/CLASSIC"

export type ShopCandidate = {
	gold: { purchasable: boolean }
	maps: Record<string, boolean>
	requiredChampion?: string
	inStore?: boolean
	hideFromAll?: boolean
}

type RemovalRule = (
	id: string,
	item: ShopCandidate,
	classicItemIds: ReadonlySet<string>,
) => boolean

/** Checked in order: an item is counted under the first rule that removes it. */
const REMOVAL_RULES = {
	notPurchasable: (_, item) => !item.gold.purchasable,
	notOnSummonersRift: (_, item) => item.maps[SUMMONERS_RIFT] !== true,
	requiredChampion: (_, item) => item.requiredChampion !== undefined,
	notInStore: (_, item) => item.inStore === false,
	hiddenFromAll: (_, item) => item.hideFromAll === true,
	// Data Dragon flags mode variants (Arena, Swiftplay, support-quest copies) as map 11 too.
	notInClassicItemList: (id, _, classicItemIds) => !classicItemIds.has(id),
} satisfies Record<string, RemovalRule>

export type RemovalRuleName = keyof typeof REMOVAL_RULES

/** An upgrade the game swaps in for free (`item-upgrades.ts`) is never sold: these rules let it through. */
const SALE_RULES: ReadonlySet<RemovalRuleName> = new Set([
	"notPurchasable",
	"notInStore",
])

const GameModeSchema = z.object({ itemLists: z.array(z.string()).min(1) })
const ItemListSchema = z.object({ mItems: z.array(z.string()) })

/** Item IDs the Summoner's Rift CLASSIC mode allows, from CommunityDragon `map11.bin.json`. */
export function classicItemIds(map11Bin: unknown): Set<string> {
	const bin = z.record(z.string(), z.unknown()).parse(map11Bin)
	const mode = GameModeSchema.parse(bin[CLASSIC_MODE])
	const ids = new Set<string>()
	for (const listKey of mode.itemLists) {
		const list = ItemListSchema.safeParse(bin[listKey])
		if (!list.success) {
			throw new Error(`map11.bin.json: CLASSIC item list ${listKey} is missing`)
		}
		for (const path of list.data.mItems) ids.add(path.replace(/^Items\//, ""))
	}
	return ids
}

type FilterShopItemsOptions = {
	/** Ids of the upgrades kept although the shop never sells them (Muramana). */
	upgradeIds?: ReadonlySet<string>
}

export function filterShopItems<T extends ShopCandidate>(
	items: Record<string, T>,
	classicIds: ReadonlySet<string>,
	{ upgradeIds = new Set() }: FilterShopItemsOptions = {},
): { kept: [string, T][]; removed: Record<RemovalRuleName, number> } {
	const rules = Object.entries(REMOVAL_RULES) as [
		RemovalRuleName,
		RemovalRule,
	][]
	const removed = Object.fromEntries(
		rules.map(([name]) => [name, 0]),
	) as Record<RemovalRuleName, number>
	const kept: [string, T][] = []
	for (const [id, item] of Object.entries(items)) {
		const rule = rules.find(
			([name, removes]) =>
				!(upgradeIds.has(id) && SALE_RULES.has(name)) &&
				removes(id, item, classicIds),
		)
		if (rule) removed[rule[0]]++
		else kept.push([id, item])
	}
	return { kept, removed }
}
