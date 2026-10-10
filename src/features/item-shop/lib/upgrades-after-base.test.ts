import { describe, expect, test } from "bun:test"
import { upgradesAfterBase } from "./upgrades-after-base"

const item = (id: string, transformsFrom?: string) => ({ id, transformsFrom })

describe("upgradesAfterBase", () => {
	test("puts each upgrade right after its base item, the rest in order", () => {
		const items = [
			item("3003"),
			item("3004"),
			item("3040", "3003"),
			item("3041"),
			item("3042", "3004"),
		]

		expect(upgradesAfterBase(items).map(({ id }) => id)).toEqual([
			"3003",
			"3040",
			"3004",
			"3042",
			"3041",
		])
	})

	test("keeps an upgrade in place when its base item is filtered out", () => {
		const items = [item("3040", "3003"), item("3041")]

		expect(upgradesAfterBase(items).map(({ id }) => id)).toEqual([
			"3040",
			"3041",
		])
	})
})
