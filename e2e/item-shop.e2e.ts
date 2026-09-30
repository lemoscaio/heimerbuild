import { expect } from "@playwright/test"
import {
	chosenItems,
	currentItems,
	itemNames,
	shopItems,
	test,
} from "./fixtures"

test("the shop filters by a stat and sorts by it", async ({
	page,
	request,
}) => {
	const items = await currentItems(request)
	const abilityPowerOf = new Map(
		items.map((item) => [item.name, item.stats.abilityPower ?? 0]),
	)
	const withAbilityPower = items.filter(
		(item) => (item.stats.abilityPower ?? 0) !== 0,
	)
	const highestFirst = withAbilityPower
		.map((item) => item.stats.abilityPower ?? 0)
		.sort((a, b) => b - a)

	await page.goto("/champions/Heimerdinger")
	const shop = shopItems(page)
	await expect(shop).toHaveCount(items.length)

	const statFilter = page.getByRole("group", { name: "Filter by stat" })
	await statFilter.getByRole("button", { name: "Ability Power" }).click()
	await expect(
		statFilter.getByRole("button", { name: "Ability Power", pressed: true }),
	).toBeVisible()
	await expect(shop).toHaveCount(withAbilityPower.length)
	expect((await itemNames(shop)).sort()).toEqual(
		withAbilityPower.map((item) => item.name).sort(),
	)

	await page.getByRole("combobox", { name: "Sort by" }).click()
	await page.getByRole("option", { name: "Ability Power" }).click()
	await expect
		.poll(async () =>
			(await itemNames(shop)).map((name) => abilityPowerOf.get(name)),
		)
		.toEqual(highestFirst)

	const withAbilityPowerOrMagicResist = items.filter(
		(item) =>
			(item.stats.abilityPower ?? 0) !== 0 ||
			(item.stats.magicResist ?? 0) !== 0,
	)
	// The sort option was picked over the grid: move off the item whose tooltip opened.
	await page.mouse.move(0, 0)
	await statFilter.getByRole("button", { name: "Magic Resistance" }).click()
	await page
		.getByRole("group", { name: "Match selected stats" })
		.getByRole("button", { name: "OR" })
		.click()
	await expect(shop).toHaveCount(withAbilityPowerOrMagicResist.length)
})

test("the shop is one Tab stop: arrow keys move between items and Enter adds one", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	const shop = shopItems(page)
	await expect(shop.first()).toBeVisible()
	const [, , third] = await itemNames(shop)

	await page.getByRole("combobox", { name: "Sort by" }).focus()
	await page.keyboard.press("Tab")
	await expect(shop.first()).toBeFocused()
	await page.keyboard.press("ArrowRight")
	await page.keyboard.press("ArrowRight")
	await expect(shop.nth(2)).toBeFocused()
	await page.keyboard.press("Enter")

	expect(await itemNames(chosenItems(page))).toEqual([`Remove ${third}`])
})

test("/ focuses the shop search, which filters by name, and Escape clears it", async ({
	page,
	request,
}) => {
	const items = await currentItems(request)
	const withZhon = items
		.filter((item) => item.name.toLowerCase().includes("zhon"))
		.map((item) => item.name)

	await page.goto("/champions/Heimerdinger")
	const shop = shopItems(page)
	await expect(shop).toHaveCount(items.length)

	const search = page.getByRole("searchbox", { name: "Search items" })
	await page.keyboard.press("/")
	await expect(search).toBeFocused()
	await page.keyboard.type("zhon")
	await expect(shop).toHaveCount(withZhon.length)
	expect((await itemNames(shop)).sort()).toEqual(withZhon.sort())

	await page.keyboard.press("Escape")
	await expect(shop).toHaveCount(items.length)
	await expect(shop.first()).toBeFocused()
})
