import { describe, expect, test } from "bun:test"
import { readShopGrouping, saveShopGrouping } from "./shop-grouping-storage"

function memoryStorage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial))
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value)
		},
	}
}

const blockedStorage = {
	getItem: () => {
		throw new Error("blocked")
	},
	setItem: () => {
		throw new Error("blocked")
	},
}

describe("shop grouping storage", () => {
	test("defaults to the in-game tiers", () => {
		expect(readShopGrouping({ storage: memoryStorage() })).toBe("tiers")
	})

	test("reads back a saved grouping", () => {
		const storage = memoryStorage()
		saveShopGrouping("compact", { storage })
		expect(readShopGrouping({ storage })).toBe("compact")
	})

	test("ignores an unknown stored value", () => {
		const storage = memoryStorage({ "heimerbuild:shop-grouping:v1": "tiles" })
		expect(readShopGrouping({ storage })).toBe("tiers")
	})

	test("never throws when storage is blocked", () => {
		expect(readShopGrouping({ storage: blockedStorage })).toBe("tiers")
		expect(() =>
			saveShopGrouping("none", { storage: blockedStorage }),
		).not.toThrow()
	})
})
