import { describe, expect, test } from "bun:test"
import communityDragonBin from "./fixtures/cdragon-items.json"
import dataDragonItems from "./fixtures/ddragon-item.json"
import map11Bin from "./fixtures/map11.bin.json"
import { normalizeItems } from "./normalize-items"
import {
	defineItemOverride,
	type ItemOverride,
} from "./overrides/item-overrides"
import { STAT_UNITS } from "./schemas/item"
import { STAT_FIELDS } from "./stat-map"

// Real 16.19.1 entries for Long Sword, Dagger, Doran's Shield, Serrated Dirk, Void Staff and Shadowflame.
function itemsOf(
	bin: unknown = communityDragonBin,
	dataDragon: unknown = dataDragonItems,
) {
	return normalizeItems(dataDragon, bin, map11Bin).file.items
}

function itemOf(id: string, bin: unknown = communityDragonBin) {
	const item = itemsOf(bin).find((entry) => entry.id === id)
	if (!item) throw new Error(`item ${id} missing from output`)
	return item
}

function statsOf(id: string) {
	return itemOf(id).stats
}

type DataDragonItems = { data: Record<string, Record<string, unknown>> }

/** Adds a copy of Long Sword under `id` with `overrides` applied. */
function withLongSwordCopy(
	items: DataDragonItems,
	id: string,
	overrides: Record<string, unknown>,
): DataDragonItems {
	items.data[id] = { ...structuredClone(items.data["1036"]), ...overrides }
	return items
}

describe("normalizeItems", () => {
	test("maps top-level PhysicalLethality alongside attack damage", () => {
		expect(statsOf("3134")).toEqual({ attackDamage: 20, lethality: 10 })
	})

	test("keeps flat and percent magic penetration separate", () => {
		expect(statsOf("4645")).toEqual({
			abilityPower: 110,
			magicPenetrationFlat: 15,
		})
		expect(statsOf("3135")).toEqual({
			abilityPower: 95,
			magicPenetrationPercent: 0.4,
		})
	})

	test("stores attack speed as a percent fraction", () => {
		expect(statsOf("1042")).toEqual({ attackSpeedPercent: 0.1 })
		expect(STAT_UNITS.attackSpeedPercent).toBe("percent")
	})

	test("stores flat regen per 5 seconds, like champion regen", () => {
		// Game file 0.8 per second; the tooltip says "Restore 4 Health every 5 seconds".
		expect(statsOf("1054")).toEqual({ health: 110, healthRegen: 4 })
	})

	test("carries Data Dragon metadata", () => {
		expect(itemOf("3134")).toMatchObject({
			name: "Serrated Dirk",
			icon: expect.stringMatching(
				/^https:\/\/ddragon\.leagueoflegends\.com\/cdn\/[\d.]+\/img\/item\/3134\.png$/,
			),
			gold: { base: 300, total: 1000, sell: 700, purchasable: true },
			tags: ["Damage", "ArmorPenetration"],
			from: ["1036", "1036"],
			inStore: true,
		})
		expect(itemOf("3134").maps).toContain(11)
	})

	test("carries the description and plaintext as plain text", () => {
		expect(itemOf("4645")).toMatchObject({
			description:
				"Cinderbloom\nMagic and true damage Critically Strike enemies below 40% Health, dealing 20% increased damage.",
			plaintext: "",
		})
		expect(itemOf("3134")).toMatchObject({
			description: "",
			plaintext: "Increases Attack Damage and Lethality",
		})
	})

	test("fails the sync on an unmapped stat-like field", () => {
		const bin = structuredClone(communityDragonBin) as Record<
			string,
			Record<string, unknown>
		>
		bin["Items/1042"].mFlatBogusMod = 5
		expect(() => itemsOf(bin)).toThrow(/mFlatBogusMod \(items 1042\)/)
	})

	test("fails the sync when a stat differs from the Data Dragon <stats> block", () => {
		const items = structuredClone(dataDragonItems) as DataDragonItems
		items.data["1036"].description =
			"<mainText><stats><attention>15</attention> Attack Damage</stats></mainText>"
		expect(() => itemsOf(communityDragonBin, items)).toThrow(
			"1036 Long Sword: attackDamage expected 15, actual 10",
		)
	})

	test("fails the sync for Serrated Dirk without the PhysicalLethality mapping", () => {
		const fields = STAT_FIELDS as Record<string, string>
		const mapping = fields.PhysicalLethality
		delete fields.PhysicalLethality
		try {
			expect(() => itemsOf()).toThrow(
				"3134 Serrated Dirk: lethality expected 10, actual (missing)",
			)
		} finally {
			fields.PhysicalLethality = mapping as string
		}
	})

	test("carries the shop epicness, 0 when the game data omits it", () => {
		expect(itemOf("1036").epicness).toBe(0)
		expect(itemOf("1054").epicness).toBe(1)
		expect(itemOf("3134").epicness).toBe(4)
		expect(itemOf("3135").epicness).toBe(5)
	})

	test("fails the sync on an epicness with no shop tier", () => {
		const bin = structuredClone(communityDragonBin) as Record<
			string,
			Record<string, unknown>
		>
		bin["Items/3134"].epicness = 3
		expect(() => itemsOf(bin)).toThrow("Item 3134: unknown epicness 3")
	})

	test("keeps only shop items in from and into", () => {
		// Long Sword builds into 25 items; of the fixture's items only Serrated Dirk.
		expect(itemOf("1036").into).toEqual(["3134"])
		expect(itemOf("3134")).toMatchObject({ from: ["1036", "1036"], into: [] })
		expect(itemOf("3135").from).toEqual([])
	})

	test("fails when a Data Dragon item has no CommunityDragon entry", () => {
		const bin = structuredClone(communityDragonBin) as Record<string, unknown>
		delete bin["Items/3134"]
		expect(() => itemsOf(bin)).toThrow(
			"Item 3134 (Serrated Dirk) has no CommunityDragon entry",
		)
	})
})

describe("normalizeItems overrides", () => {
	const base = {
		id: "long-sword-fix",
		itemId: "1036",
		since: "16.19",
		reason: "test",
	} as const
	const normalizeWith = (override: ItemOverride) =>
		normalizeItems(dataDragonItems, communityDragonBin, map11Bin, {
			overrides: [override],
		})

	test("applies an override to the normalized item and reports it", () => {
		const { file, overrides } = normalizeWith(
			defineItemOverride({
				...base,
				field: "tags",
				apply: (tags) => [...tags, "Boots"],
			}),
		)

		expect(file.items.find((item) => item.id === "1036")?.tags).toEqual([
			"Damage",
			"Lane",
			"Boots",
		])
		expect(overrides.applied).toEqual([
			{ id: "long-sword-fix", entity: "item 1036" },
		])
	})

	test("validates the overridden item, so a wrong fix fails the sync", () => {
		const wrongStat = defineItemOverride({
			...base,
			field: "stats",
			apply: (stats) => ({ ...stats, attackDamage: 99 }),
		})
		const invalidLimit = defineItemOverride({
			...base,
			field: "groupLimits",
			apply: () => [{ group: "Boots", max: 0 }],
		})

		expect(() => normalizeWith(wrongStat)).toThrow(
			"1036 Long Sword: attackDamage expected 10, actual 99",
		)
		expect(() => normalizeWith(invalidLimit)).toThrow("groupLimits")
	})
})

describe("normalizeItems shop filter", () => {
	const longSword = (dataDragonItems as DataDragonItems).data["1036"]
	const overridesByRule = {
		notPurchasable: {
			id: "9001",
			overrides: {
				gold: { ...(longSword.gold as object), purchasable: false },
			},
		},
		notOnSummonersRift: {
			id: "9002",
			overrides: { maps: { "11": false, "12": true } },
		},
		requiredChampion: {
			id: "9003",
			overrides: { requiredChampion: "Kalista" },
		},
		notInStore: { id: "9004", overrides: { inStore: false } },
		hiddenFromAll: { id: "9005", overrides: { hideFromAll: true } },
		// Guardian's Horn: flagged for map 11 but only listed for Swiftplay.
		notInClassicItemList: { id: "2051", overrides: {} },
	}

	function dataDragonWithEveryRule(): DataDragonItems {
		const items = structuredClone(dataDragonItems) as DataDragonItems
		for (const { id, overrides } of Object.values(overridesByRule)) {
			withLongSwordCopy(items, id, overrides)
		}
		return items
	}

	test("keeps only items buyable on Summoner's Rift", () => {
		const ids = itemsOf(communityDragonBin, dataDragonWithEveryRule()).map(
			(item) => item.id,
		)
		expect(ids).toEqual(["1036", "1042", "1054", "3134", "3135", "4645"])
	})

	test("counts removed items per rule", () => {
		const { removed } = normalizeItems(
			dataDragonWithEveryRule(),
			communityDragonBin,
			map11Bin,
		)
		expect(removed).toEqual({
			notPurchasable: 1,
			notOnSummonersRift: 1,
			requiredChampion: 1,
			notInStore: 1,
			hiddenFromAll: 1,
			notInClassicItemList: 1,
		})
	})

	test("counts an item breaking several rules only under the first", () => {
		const items = withLongSwordCopy(
			structuredClone(dataDragonItems) as DataDragonItems,
			"9001",
			{ ...overridesByRule.notPurchasable.overrides, inStore: false },
		)
		const { removed } = normalizeItems(items, communityDragonBin, map11Bin)
		expect(removed.notPurchasable).toBe(1)
		expect(removed.notInStore).toBe(0)
	})
})

describe("normalizeItems group limits", () => {
	type Bin = Record<string, Record<string, unknown>>

	test("keeps the item groups that cap how many a build may hold, with their label", () => {
		expect(itemOf("3135").groupLimits).toEqual([
			{ group: "VoidPen", max: 1, label: "Blight" },
		])
		expect(itemOf("4645").groupLimits).toEqual([{ group: "4645", max: 1 }])
	})

	test("fails the sync on a new group of several items without a label", () => {
		const bin = structuredClone(communityDragonBin) as Bin
		bin["Items/ItemGroups/Fresh"] = {
			mItemGroupID: "Fresh",
			mMaxGroupOwnable: 1,
		}
		for (const id of ["3134", "3135"]) {
			const groups = bin[`Items/${id}`].mItemGroups as string[]
			groups.push("Items/ItemGroups/Fresh")
		}
		expect(() => itemsOf(bin)).toThrow("Fresh (Serrated Dirk, Void Staff)")
	})

	test("skips groups without a cap", () => {
		expect(itemOf("1036").groupLimits).toEqual([])
	})

	test("fails the sync when an item group is missing", () => {
		const bin = structuredClone(communityDragonBin) as Bin
		delete bin["Items/ItemGroups/VoidPen"]
		expect(() => itemsOf(bin)).toThrow(
			"Item 3135: item group Items/ItemGroups/VoidPen is missing",
		)
	})
})

describe("normalizeItems effects", () => {
	type Bin = Record<string, Record<string, unknown>>
	const wounds =
		"<mainText><stats><attention>10</attention> Attack Damage</stats><br><br><passive>Rend</passive>: Damage applies <keyword>40% Wounds</keyword>.</mainText>"
	const grievousValues = [
		{ mName: "GrievousAmount", mValue: 0.4, __type: "ItemDataValue" },
	]

	function withWounds({ keyword, data }: { keyword: boolean; data: boolean }) {
		const items = structuredClone(dataDragonItems) as DataDragonItems
		const bin = structuredClone(communityDragonBin) as Bin
		if (keyword) items.data["1036"].description = wounds
		if (data) bin["Items/1036"].mDataValues = grievousValues
		return () => itemsOf(bin, items).find((item) => item.id === "1036")
	}

	test("an item has an active when CommunityDragon marks it clickable", () => {
		const bin = structuredClone(communityDragonBin) as Bin
		bin["Items/3134"].clickable = true
		expect(itemOf("3134", bin).active).toBe(true)
		expect(itemOf("3134").active).toBe(false)
	})

	test("drops the Data Dragon Active tag, which misses many actives", () => {
		const items = structuredClone(dataDragonItems) as DataDragonItems
		items.data["1036"].tags = ["Damage", "Active"]
		const longSword = itemsOf(communityDragonBin, items).find(
			(item) => item.id === "1036",
		)
		expect(longSword?.tags).toEqual(["Damage"])
	})

	test("an item applies anti-heal when its description has the Wounds keyword", () => {
		expect(withWounds({ keyword: true, data: true })()?.antiHeal).toBe(true)
		expect(itemOf("1036").antiHeal).toBe(false)
	})

	test("fails the sync when the Wounds keyword and the Grievous data values disagree", () => {
		expect(withWounds({ keyword: true, data: false })).toThrow(
			"1036 Long Sword: Wounds keyword without Grievous data values",
		)
		expect(withWounds({ keyword: false, data: true })).toThrow(
			"1036 Long Sword: Grievous data values without a Wounds keyword",
		)
	})
})

describe("normalizeItems roles", () => {
	type Bin = Record<string, Record<string, unknown>>

	test("maps mItemAttributes to the in-game shop class filters", () => {
		expect(itemOf("1036").roles).toEqual(["ASSASSIN", "FIGHTER", "MARKSMAN"])
		expect(itemOf("3135").roles).toEqual(["MAGE"])
	})

	test("leaves roles empty when the item has no attributes", () => {
		const bin = structuredClone(communityDragonBin) as Bin
		delete bin["Items/3135"].mItemAttributes
		expect(itemOf("3135", bin).roles).toEqual([])
	})

	test("fails the sync on an unknown attribute value", () => {
		const bin = structuredClone(communityDragonBin) as Bin
		bin["Items/3135"].mItemAttributes = [16, 64]
		expect(() => itemsOf(bin)).toThrow(
			"Item 3135: unknown mItemAttributes value 64",
		)
	})
})
