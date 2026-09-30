import { describe, expect, test } from "bun:test"
import {
	readChampionListExpanded,
	saveChampionListExpanded,
} from "./champion-list-storage"

function memoryStorage() {
	const values = new Map<string, string>()
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

describe("champion list storage", () => {
	test("starts collapsed on a first visit", () => {
		expect(readChampionListExpanded({ storage: memoryStorage() })).toBe(false)
	})

	test("remembers the last state", () => {
		const storage = memoryStorage()
		saveChampionListExpanded(true, { storage })
		expect(readChampionListExpanded({ storage })).toBe(true)
		saveChampionListExpanded(false, { storage })
		expect(readChampionListExpanded({ storage })).toBe(false)
	})

	test("never throws when storage is blocked", () => {
		expect(readChampionListExpanded({ storage: blockedStorage })).toBe(false)
		expect(() =>
			saveChampionListExpanded(true, { storage: blockedStorage }),
		).not.toThrow()
	})
})
