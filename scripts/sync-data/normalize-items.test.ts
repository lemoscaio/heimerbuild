import { describe, expect, test } from "bun:test"
import communityDragonBin from "./fixtures/cdragon-items.json"
import dataDragonItems from "./fixtures/ddragon-item.json"
import { normalizeItems } from "./normalize-items"
import { STAT_UNITS } from "./schemas/item"

// Real 16.19.1 entries for Long Sword, Dagger, Serrated Dirk, Void Staff and Shadowflame.
function statsOf(id: string, bin: unknown = communityDragonBin) {
	const item = normalizeItems(dataDragonItems, bin).items.find(
		(entry) => entry.id === id,
	)
	if (!item) throw new Error(`item ${id} missing from output`)
	return item.stats
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

	test("carries Data Dragon metadata", () => {
		const dirk = normalizeItems(dataDragonItems, communityDragonBin).items.find(
			(item) => item.id === "3134",
		)
		expect(dirk).toMatchObject({
			name: "Serrated Dirk",
			icon: "3134.png",
			gold: { base: 300, total: 1000, sell: 700, purchasable: true },
			tags: ["Damage", "ArmorPenetration"],
			from: ["1036", "1036"],
			inStore: true,
		})
		expect(dirk?.maps).toContain(11)
	})

	test("fails the sync on an unmapped stat-like field", () => {
		const bin = structuredClone(communityDragonBin) as Record<
			string,
			Record<string, unknown>
		>
		bin["Items/1042"].mFlatBogusMod = 5
		expect(() => normalizeItems(dataDragonItems, bin)).toThrow(
			/mFlatBogusMod \(items 1042\)/,
		)
	})

	test("fails when a Data Dragon item has no CommunityDragon entry", () => {
		const bin = structuredClone(communityDragonBin) as Record<string, unknown>
		delete bin["Items/3134"]
		expect(() => normalizeItems(dataDragonItems, bin)).toThrow(
			"Item 3134 (Serrated Dirk) has no CommunityDragon entry",
		)
	})
})
