import { beforeAll, describe, expect, test } from "bun:test"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { filterItemsByConditions } from "./filter-items-by-conditions"
import { filterItemsByRole } from "./filter-items-by-role"
import { shopTierOf } from "./group-shop-items"
import { isBoots } from "./is-boots"

async function currentPatchItems() {
	const { currentPatch } = await Bun.file(
		new URL("../../../../public/data/manifest.json", import.meta.url),
	).json()
	const file = Bun.file(
		new URL(
			`../../../../public/data/${currentPatch}/items.json`,
			import.meta.url,
		),
	)
	return ItemsFileSchema.parse(await file.json()).items
}

// Riot tags Gunmetal Greaves NonbootsMovement, so only its purchase group marks it as boots.
describe("Gunmetal Greaves without the Boots tag", () => {
	let gunmetal: Item

	beforeAll(async () => {
		const item = (await currentPatchItems()).find(
			({ name }) => name === "Gunmetal Greaves",
		)
		if (!item) throw new Error("Gunmetal Greaves is missing from the data")
		gunmetal = { ...item, tags: item.tags.filter((tag) => tag !== "Boots") }
	})

	test("is boots", () => {
		expect(isBoots(gunmetal)).toBe(true)
	})

	test("goes to the boots section", () => {
		expect(shopTierOf(gunmetal)).toBe("boots")
	})

	test("stays in the shop under every role, like other boots", () => {
		expect(filterItemsByRole([gunmetal], "MAGE")).toEqual([gunmetal])
	})

	test("matches the boots group filter", () => {
		expect(
			filterItemsByConditions(
				[gunmetal],
				[{ kind: "group", group: "Boots", label: "Boots" }],
			),
		).toEqual([gunmetal])
	})
})
